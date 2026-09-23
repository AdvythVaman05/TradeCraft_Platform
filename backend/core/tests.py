import os
import io
import json
from PIL import Image
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError, ImproperlyConfigured
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from .models import SkillListing, Transaction, ChatRoom, ChatMessage, upi_qr_upload_path
from .validators import validate_image_file, MAX_UPLOAD_SIZE
from .exceptions import custom_exception_handler
from .serializers import PublicUserSerializer, PrivateUserSerializer, SkillListingSerializer, TransactionSerializer
from project.core.consumers import verify_user_room_access

User = get_user_model()


def create_test_image(format="PNG", size=(100, 100), color="blue"):
    """Helper to generate a valid in-memory image for upload testing."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    ext = ".jpg" if format.upper() == "JPEG" else f".{format.lower()}"
    return SimpleUploadedFile(f"test_upload{ext}", buf.read(), content_type=f"image/{format.lower()}")


class SecurityConfigurationTests(TestCase):
    """Test configuration hardening and secret handling."""

    def test_missing_secret_key_raises_improperly_configured(self):
        """Ensure missing SECRET_KEY fails fast with ImproperlyConfigured."""
        import importlib
        import sys
        from unittest.mock import patch

        old_env = os.environ.copy()
        try:
            if "SECRET_KEY" in os.environ:
                del os.environ["SECRET_KEY"]
            sys.modules.pop("project.settings", None)
            with patch("dotenv.load_dotenv"):
                with self.assertRaises(ImproperlyConfigured):
                    importlib.import_module("project.settings")
        finally:
            os.environ.clear()
            os.environ.update(old_env)
            sys.modules.pop("project.settings", None)

    def test_production_allowed_hosts_wildcard_rejected(self):
        """Ensure ALLOWED_HOSTS=['*'] in production raises ImproperlyConfigured."""
        import importlib
        import sys
        from unittest.mock import patch

        old_env = os.environ.copy()
        try:
            os.environ["DEBUG"] = "False"
            os.environ["SECRET_KEY"] = "test-secret-key-at-least-50-characters-long-1234567890"
            os.environ["ALLOWED_HOSTS"] = "*"
            os.environ["CORS_ALLOWED_ORIGINS"] = "https://example.com"
            sys.modules.pop("project.settings", None)
            with patch("dotenv.load_dotenv"):
                with self.assertRaises(ImproperlyConfigured):
                    importlib.import_module("project.settings")
        finally:
            os.environ.clear()
            os.environ.update(old_env)
            sys.modules.pop("project.settings", None)

    def test_production_cors_empty_rejected(self):
        """Ensure missing CORS_ALLOWED_ORIGINS in production raises ImproperlyConfigured."""
        import importlib
        import sys
        from unittest.mock import patch

        old_env = os.environ.copy()
        try:
            os.environ["DEBUG"] = "False"
            os.environ["SECRET_KEY"] = "test-secret-key-at-least-50-characters-long-1234567890"
            os.environ["ALLOWED_HOSTS"] = "example.com"
            if "CORS_ALLOWED_ORIGINS" in os.environ:
                del os.environ["CORS_ALLOWED_ORIGINS"]
            sys.modules.pop("project.settings", None)
            with patch("dotenv.load_dotenv"):
                with self.assertRaises(ImproperlyConfigured):
                    importlib.import_module("project.settings")
        finally:
            os.environ.clear()
            os.environ.update(old_env)
            sys.modules.pop("project.settings", None)

    def test_cors_rejects_unauthorized_origin(self):
        """Ensure CORS headers are not returned for untrusted origins."""
        client = APIClient()
        response = client.get("/api/listings/", HTTP_ORIGIN="http://malicious-site.com")
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    def test_cors_allows_configured_origin(self):
        """Ensure CORS headers are returned for configured origins."""
        client = APIClient()
        response = client.get("/api/listings/", HTTP_ORIGIN="http://localhost:5173")
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")

    def test_health_check_endpoint(self):
        """Health check returns 200 OK without requiring authentication or exposing secrets."""
        client = APIClient()
        res_root = client.get("/health/")
        self.assertEqual(res_root.status_code, status.HTTP_200_OK)
        self.assertEqual(res_root.json(), {"status": "ok"})

        res_api = client.get("/api/health/")
        self.assertEqual(res_api.status_code, status.HTTP_200_OK)
        self.assertEqual(res_api.json(), {"status": "ok"})

    def test_upi_qr_upload_path_sanitizes_filename(self):
        """Ensure upload path generates random UUID and strips traversal/dangerous filenames."""
        malicious_filename = "../../../etc/cron.d/malicious.php.png"
        path = upi_qr_upload_path(None, malicious_filename)
        self.assertTrue(path.startswith("upi_qr/"))
        self.assertFalse(".." in path)
        self.assertTrue(path.endswith(".png"))
        self.assertNotIn("malicious", path)

    def test_validate_image_file_accepts_valid_images(self):
        """Ensure PNG, JPEG, and WEBP images pass validation."""
        for fmt in ["PNG", "JPEG", "WEBP"]:
            img_file = create_test_image(format=fmt)
            validate_image_file(img_file)

    def test_validate_image_file_rejects_oversized_file(self):
        """Ensure files over 2MB are rejected."""
        oversized = SimpleUploadedFile(
            "large.png",
            b"0" * (MAX_UPLOAD_SIZE + 1024),
            content_type="image/png"
        )
        with self.assertRaises(ValidationError) as ctx:
            validate_image_file(oversized)
        self.assertIn("exceeds the 2MB limit", str(ctx.exception))

    def test_validate_image_file_rejects_disallowed_extension(self):
        """Ensure non-image extensions are rejected immediately."""
        fake_file = SimpleUploadedFile("payload.exe", b"MZ\x90\x00\x03", content_type="application/octet-stream")
        with self.assertRaises(ValidationError) as ctx:
            validate_image_file(fake_file)
        self.assertIn("Unsupported file extension", str(ctx.exception))

    def test_validate_image_file_rejects_svg_markup(self):
        """Ensure SVG files containing markup/scripts are rejected."""
        svg_content = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        svg_file = SimpleUploadedFile("image.png", svg_content, content_type="image/png")
        with self.assertRaises(ValidationError) as ctx:
            validate_image_file(svg_file)
        self.assertIn("Invalid image", str(ctx.exception))

    def test_validate_image_file_rejects_html_content(self):
        """Ensure HTML content disguised as PNG is rejected."""
        html_content = b'<html><head></head><body><h1>Fake</h1></body></html>'
        html_file = SimpleUploadedFile("fake.png", html_content, content_type="image/png")
        with self.assertRaises(ValidationError) as ctx:
            validate_image_file(html_file)
        self.assertIn("Invalid image", str(ctx.exception))

    def test_validate_image_file_rejects_corrupted_image(self):
        """Ensure corrupted binary data is rejected."""
        corrupt = SimpleUploadedFile("corrupt.png", b"\x89PNG\r\n\x1a\ncorrupted_data", content_type="image/png")
        with self.assertRaises(ValidationError) as ctx:
            validate_image_file(corrupt)
        self.assertIn("not a valid image", str(ctx.exception))


class ExceptionHandlingSecurityTests(TestCase):
    """Test custom DRF exception handler prevents data leakage."""

    def test_custom_exception_handler_masks_unhandled_500(self):
        """Unhandled exceptions must return generic 500 without leaking stack traces or internal DB info."""
        class MockException(Exception):
            pass

        exc = MockException("FATAL: relation \"users_secret_table\" does not exist at /var/www/backend/db.py line 42")
        context = {
            "view": None,
            "request": None
        }

        response = custom_exception_handler(exc, context)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data, {"error": "An internal server error occurred."})
        self.assertNotIn("relation", str(response.data))
        self.assertNotIn("users_secret_table", str(response.data))
        self.assertNotIn("/var/www", str(response.data))


class ObjectLevelAuthorizationAndPrivacyTests(TestCase):
    """Phase 2: Comprehensive tests for object-level authorization and user data privacy."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="user_a",
            email="usera@secret.com",
            phone="+91 9999999991",
            bio="User A Bio",
            upi_id="usera@okhdfc",
            password="Password123!",
            time_credits=Decimal("100.00")
        )
        self.user_b = User.objects.create_user(
            username="user_b",
            email="userb@secret.com",
            phone="+91 9999999992",
            bio="User B Bio",
            upi_id="userb@okicici",
            password="Password123!",
            time_credits=Decimal("50.00")
        )
        self.unrelated_user = User.objects.create_user(
            username="unrelated_user",
            email="unrelated@secret.com",
            password="Password123!",
            time_credits=Decimal("10.00")
        )

        self.listing_a = SkillListing.objects.create(
            provider=self.user_a,
            title="User A Listing",
            description="High value tutoring",
            price_rupees=Decimal("1000.00"),
            price_timecredits=Decimal("15.00"),
            location="Bangalore"
        )

    # 1. Public User Data Exposure Tests
    def test_public_listing_does_not_expose_private_user_fields(self):
        """Public listings must NEVER expose email, phone, upi_id, upi_qr, time_credits, or bought_listings."""
        res = self.client.get(f"/api/listings/{self.listing_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        provider_data = res.data["provider"]

        self.assertEqual(provider_data["username"], "user_a")
        self.assertEqual(provider_data["bio"], "User A Bio")
        self.assertNotIn("email", provider_data)
        self.assertNotIn("phone", provider_data)
        self.assertNotIn("upi_id", provider_data)
        self.assertNotIn("upi_qr", provider_data)
        self.assertNotIn("time_credits", provider_data)
        self.assertNotIn("bought_listings", provider_data)

    def test_public_user_serializer_fields(self):
        """PublicUserSerializer strictly allows only public fields."""
        serializer = PublicUserSerializer(self.user_a)
        data = serializer.data
        self.assertEqual(set(data.keys()), {"id", "username", "bio"})

    def test_private_user_serializer_contains_private_fields(self):
        """PrivateUserSerializer contains user's own private information."""
        serializer = PrivateUserSerializer(self.user_a)
        data = serializer.data
        self.assertEqual(data["email"], "usera@secret.com")
        self.assertEqual(data["phone"], "+91 9999999991")
        self.assertEqual(data["upi_id"], "usera@okhdfc")
        self.assertEqual(Decimal(str(data["time_credits"])), Decimal("100.00"))

    # 2. Listing Authorization Tests
    def test_user_b_cannot_edit_user_a_listing(self):
        """User B cannot edit User A's listing (403 Forbidden)."""
        self.client.force_authenticate(user=self.user_b)
        res = self.client.put(f"/api/listings/{self.listing_a.id}/", {
            "title": "Hacked Title",
            "description": "Tampered description"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.listing_a.refresh_from_db()
        self.assertEqual(self.listing_a.title, "User A Listing")

    def test_user_b_cannot_delete_user_a_listing(self):
        """User B cannot delete User A's listing (403 Forbidden)."""
        self.client.force_authenticate(user=self.user_b)
        res = self.client.delete(f"/api/listings/{self.listing_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(SkillListing.objects.filter(pk=self.listing_a.id).exists())

    def test_listing_provider_cannot_be_spoofed_via_payload(self):
        """Provider ownership is derived from request.user and payload provider is ignored."""
        self.client.force_authenticate(user=self.user_b)
        res = self.client.post("/api/listings/", {
            "title": "User B Created",
            "description": "Testing provider spoof",
            "provider": self.user_a.id,
            "price_rupees": "500.00"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_listing = SkillListing.objects.get(pk=res.data["id"])
        self.assertEqual(new_listing.provider, self.user_b)

    # 3. Transaction Authorization Tests
    def test_unrelated_user_cannot_retrieve_transaction(self):
        """Unrelated user cannot retrieve a transaction between User A and User B."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="UPI"
        )
        self.client.force_authenticate(user=self.unrelated_user)
        res = self.client.get(f"/api/transactions/{txn.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Unrelated user's transaction list does not include it
        list_res = self.client.get("/api/transactions/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 0)

    def test_buyer_cannot_verify_or_reject_transaction(self):
        """Buyer cannot verify or reject their own transaction."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="TC",
            tc_amount=Decimal("15.00")
        )
        self.client.force_authenticate(user=self.user_b)
        ver_res = self.client.post(f"/api/transactions/{txn.id}/verify/")
        self.assertEqual(ver_res.status_code, status.HTTP_403_FORBIDDEN)

        rej_res = self.client.post(f"/api/transactions/{txn.id}/reject/")
        self.assertEqual(rej_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unrelated_user_cannot_verify_or_reject_transaction(self):
        """Unrelated user cannot verify or reject a transaction."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="UPI"
        )
        self.client.force_authenticate(user=self.unrelated_user)
        ver_res = self.client.post(f"/api/transactions/{txn.id}/verify/")
        self.assertEqual(ver_res.status_code, status.HTTP_404_NOT_FOUND)

    # 4. Time Credit Integrity Tests
    def test_client_cannot_arbitrarily_modify_time_credits(self):
        """Clients cannot modify time_credits via profile updates."""
        self.client.force_authenticate(user=self.user_a)
        res = self.client.put("/api/user/me/", {
            "password": "Password123!",
            "time_credits": 99999.00
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user_a.refresh_from_db()
        self.assertEqual(self.user_a.time_credits, Decimal("100.00"))

    def test_insufficient_time_credits_fails_safely(self):
        """Creating or verifying a TC transaction with insufficient credits fails safely."""
        poor_user = User.objects.create_user(
            username="poor_user",
            email="poor@test.com",
            password="Password123!",
            time_credits=Decimal("5.00")
        )
        self.client.force_authenticate(user=poor_user)

        # Creation check
        res = self.client.post("/api/transactions/", {
            "listing": self.listing_a.id,
            "payment_method": "TC"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient Time Credits", str(res.data))

    def test_atomic_tc_deduction_prevents_negative_balance(self):
        """Transaction.verify() raises ValueError if buyer has insufficient credits at verification time."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="TC",
            tc_amount=Decimal("1000.00")  # Exceeds user_b's balance of 50.00
        )
        with self.assertRaises(ValueError) as ctx:
            txn.verify()
        self.assertIn("Buyer does not have enough Time Credits", str(ctx.exception))
        self.user_b.refresh_from_db()
        self.assertEqual(self.user_b.time_credits, Decimal("50.00"))

    # 5. Chat REST Authorization Tests
    def test_unrelated_user_cannot_access_transaction_chat(self):
        """Unrelated user cannot access a private transaction chat."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="UPI"
        )
        self.client.force_authenticate(user=self.unrelated_user)

        get_res = self.client.get(f"/api/chat/transaction/{txn.id}/thread/")
        self.assertEqual(get_res.status_code, status.HTTP_403_FORBIDDEN)

        post_res = self.client.post(f"/api/chat/transaction/{txn.id}/thread/", {
            "message": "Intruder message"
        })
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unrelated_user_cannot_access_listing_buyer_chat(self):
        """Unrelated user cannot access listing private chat between provider and specific buyer."""
        self.client.force_authenticate(user=self.unrelated_user)
        get_res = self.client.get(f"/api/chat/listing/{self.listing_a.id}/thread/?buyer_id={self.user_b.id}")
        self.assertEqual(get_res.status_code, status.HTTP_403_FORBIDDEN)

        post_res = self.client.post(f"/api/chat/listing/{self.listing_a.id}/thread/", {
            "buyer_id": self.user_b.id,
            "message": "Intruder message"
        })
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

    # 6. WebSocket Authorization Tests
    def test_websocket_authorization_allows_authorized_participants(self):
        """WebSocket room access check allows buyer and seller for txn rooms."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="UPI"
        )
        room_name = f"txn-{txn.id}"

        # Buyer is allowed
        self.assertIsNotNone(verify_user_room_access(self.user_b, room_name))
        # Seller is allowed
        self.assertIsNotNone(verify_user_room_access(self.user_a, room_name))

    def test_websocket_authorization_rejects_unauthorized_users(self):
        """WebSocket room access check rejects unrelated authenticated users."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="UPI"
        )
        room_name = f"txn-{txn.id}"

        # Unrelated user is rejected
        self.assertIsNone(verify_user_room_access(self.unrelated_user, room_name))
        # Anonymous user is rejected
        self.assertIsNone(verify_user_room_access(None, room_name))

    def test_websocket_authorization_listing_buyer_room(self):
        """WebSocket room access check for listing private chat rooms."""
        room_name = f"listing-{self.listing_a.id}-buyer-{self.user_b.id}"

        # Provider is allowed
        self.assertIsNotNone(verify_user_room_access(self.user_a, room_name))
        # Specific buyer is allowed
        self.assertIsNotNone(verify_user_room_access(self.user_b, room_name))
        # Unrelated user is rejected
        self.assertIsNone(verify_user_room_access(self.unrelated_user, room_name))


class CoreBusinessLogicPreservationTests(TestCase):
    """Verify that all core business logic continues to function seamlessly after hardening."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.buyer = User.objects.create_user(
            username="alice_buyer",
            email="alice@test.com",
            password="SecurePassword123!",
            time_credits=Decimal("100.00")
        )
        self.seller = User.objects.create_user(
            username="bob_seller",
            email="bob@test.com",
            password="SecurePassword123!",
            time_credits=Decimal("50.00"),
            upi_id="bob@okaxis"
        )
        self.listing = SkillListing.objects.create(
            provider=self.seller,
            title="Django Security Consulting",
            description="Hardening reviews and architectural guidance.",
            price_rupees=Decimal("1500.00"),
            price_timecredits=Decimal("20.00"),
            location="Remote"
        )

    def test_user_registration_endpoint(self):
        """User registration endpoint registers new users cleanly."""
        res = self.client.post("/api/users/register/", {
            "username": "charlie_new",
            "email": "charlie@test.com",
            "password": "StrongPassword456!"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(username="charlie_new").exists())

    def test_jwt_login_endpoint(self):
        """JWT login endpoint returns valid access and refresh tokens."""
        res = self.client.post("/api/auth/login/", {
            "username": "alice_buyer",
            "password": "SecurePassword123!"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_user_me_profile_and_qr_upload(self):
        """UserMe profile update validates password and accepts safe image uploads."""
        self.client.force_authenticate(user=self.seller)

        # 1. Invalid password check
        res_fail = self.client.put("/api/user/me/", {
            "password": "WrongPassword!",
            "bio": "New bio"
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_fail.data["error"], "Invalid password")

        # 2. Valid update with valid QR image
        qr_img = create_test_image(format="PNG")
        res_ok = self.client.put("/api/user/me/", {
            "password": "SecurePassword123!",
            "bio": "Updated professional bio",
            "upi_qr": qr_img
        }, format="multipart")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.bio, "Updated professional bio")
        self.assertTrue(self.seller.upi_qr.name.startswith("upi_qr/"))

    def test_user_me_rejects_malicious_qr_upload(self):
        """UserMe profile update rejects non-image payload for upi_qr."""
        self.client.force_authenticate(user=self.seller)
        bad_file = SimpleUploadedFile("evil.png", b"<script>alert(1)</script>", content_type="image/png")
        res = self.client.put("/api/user/me/", {
            "password": "SecurePassword123!",
            "upi_qr": bad_file
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid image", res.data["error"])

    def test_time_credit_transaction_flow(self):
        """Time Credit transaction creation, verification, and balance transfer."""
        self.client.force_authenticate(user=self.buyer)

        # Buyer creates TC transaction
        res = self.client.post("/api/transactions/", {
            "listing": self.listing.id,
            "payment_method": "TC"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        txn_id = res.data["id"]

        # Seller verifies transaction
        self.client.force_authenticate(user=self.seller)
        verify_res = self.client.post(f"/api/transactions/{txn_id}/verify/")
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        # Verify balances: buyer 100 - 20 = 80, seller 50 + 20 = 70
        self.buyer.refresh_from_db()
        self.seller.refresh_from_db()
        self.assertEqual(self.buyer.time_credits, Decimal("80.00"))
        self.assertEqual(self.seller.time_credits, Decimal("70.00"))

    def test_upi_transaction_flow_with_submission_and_verification(self):
        """UPI transaction flow: buyer submits txn_id, seller verifies."""
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post("/api/transactions/", {
            "listing": self.listing.id,
            "payment_method": "UPI"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        txn_id = res.data["id"]

        # Buyer submits UPI txn id
        sub_res = self.client.post(f"/api/transactions/{txn_id}/submit_txnid/", {
            "buyer_txn_id": "UPI1234567890"
        })
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)

        # Seller verifies
        self.client.force_authenticate(user=self.seller)
        ver_res = self.client.post(f"/api/transactions/{txn_id}/verify/")
        self.assertEqual(ver_res.status_code, status.HTTP_200_OK)

        txn = Transaction.objects.get(pk=txn_id)
        self.assertTrue(txn.seller_verified)

    def test_upi_transaction_rejection_flow(self):
        """UPI transaction rejection flow."""
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post("/api/transactions/", {
            "listing": self.listing.id,
            "payment_method": "UPI"
        })
        txn_id = res.data["id"]

        # Seller rejects
        self.client.force_authenticate(user=self.seller)
        rej_res = self.client.post(f"/api/transactions/{txn_id}/reject/")
        self.assertEqual(rej_res.status_code, status.HTTP_200_OK)

        txn = Transaction.objects.get(pk=txn_id)
        self.assertTrue(txn.seller_rejected)

    def test_chat_thread_endpoints(self):
        """Chat thread message retrieval and posting."""
        self.client.force_authenticate(user=self.buyer)

        # Post chat message for listing
        post_res = self.client.post(f"/api/chat/listing/{self.listing.id}/thread/", {
            "message": "Hello seller, is this skill available this weekend?"
        })
        self.assertEqual(post_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(post_res.data["content"], "Hello seller, is this skill available this weekend?")

        # Get chat thread
        get_res = self.client.get(f"/api/chat/listing/{self.listing.id}/thread/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_res.data["messages"]), 1)


class SecurityAuditRegressionTests(TestCase):
    """Deep security audit tests covering passwords, concurrency, mass assignment, and access boundaries."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="aud_user_a",
            email="usera@corp.internal",
            password="StrongAuthPassword123!",
            time_credits=Decimal("50.00"),
            upi_id="usera@upi"
        )
        self.user_b = User.objects.create_user(
            username="aud_user_b",
            email="userb@corp.internal",
            password="StrongAuthPassword456!",
            time_credits=Decimal("50.00"),
            upi_id="userb@upi"
        )
        self.user_c = User.objects.create_user(
            username="aud_user_c",
            email="userc@corp.internal",
            password="StrongAuthPassword789!",
            time_credits=Decimal("0.00"),
            upi_id="userc@upi"
        )

        self.listing_a = SkillListing.objects.create(
            provider=self.user_a,
            title="Advanced Security Review",
            description="Code audit and threat modeling",
            price_rupees=Decimal("2000.00"),
            price_timecredits=Decimal("30.00"),
            location="Remote"
        )

    # --- AUDIT 1: Password Security ---
    def test_password_storage_uses_django_hasher_and_not_plaintext_or_sha256(self):
        """Verify passwords are saved via Django password hasher (PBKDF2/Argon2/bcrypt) and never plaintext or raw SHA256."""
        import hashlib
        raw_pw = "StrongAuthPassword123!"
        sha256_digest = hashlib.sha256(raw_pw.encode()).hexdigest()

        stored_hash = self.user_a.password
        self.assertNotEqual(stored_hash, raw_pw)
        self.assertNotEqual(stored_hash, sha256_digest)
        self.assertTrue(
            stored_hash.startswith("pbkdf2_sha256$") or
            stored_hash.startswith("argon2") or
            stored_hash.startswith("bcrypt")
        )

        # Verification via check_password
        self.assertTrue(self.user_a.check_password(raw_pw))
        self.assertFalse(self.user_a.check_password("WrongPassword999!"))

    # --- AUDIT 2: Transaction Payment Data Access ---
    def test_transaction_payment_data_access_boundaries(self):
        """Ensure seller payment details (UPI ID/QR) are accessible only to the authorized buyer/seller of that transaction."""
        txn = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="UPI"
        )

        # 1. Anonymous user: 401 Unauthorized or 403 Forbidden
        anon_client = APIClient()
        res_anon = anon_client.get(f"/api/transactions/{txn.id}/")
        self.assertIn(res_anon.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # 2. Authorized buyer: can view transaction and seller UPI ID
        self.client.force_authenticate(user=self.user_b)
        res_buyer = self.client.get(f"/api/transactions/{txn.id}/")
        self.assertEqual(res_buyer.status_code, status.HTTP_200_OK)
        self.assertEqual(res_buyer.data["seller"]["upi_id"], "usera@upi")
        self.assertNotIn("email", res_buyer.data["seller"])

        # 3. Seller: can view own transaction
        self.client.force_authenticate(user=self.user_a)
        res_seller = self.client.get(f"/api/transactions/{txn.id}/")
        self.assertEqual(res_seller.status_code, status.HTTP_200_OK)

        # 4. Unrelated user: receives 404 Not Found (cannot view or scrape payment details)
        self.client.force_authenticate(user=self.user_c)
        res_unrelated = self.client.get(f"/api/transactions/{txn.id}/")
        self.assertEqual(res_unrelated.status_code, status.HTTP_404_NOT_FOUND)

    # --- AUDIT 3: Time Credit Concurrency & Double Spending ---
    def test_concurrent_double_spending_prevention(self):
        """Two transactions requiring 30 TC each on a 50 TC balance: second verify MUST fail, preventing negative balance."""
        # user_b has 50 TC balance.
        txn1 = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="TC",
            tc_amount=Decimal("30.00")
        )
        txn2 = Transaction.objects.create(
            buyer=self.user_b,
            seller=self.user_a,
            listing=self.listing_a,
            payment_method="TC",
            tc_amount=Decimal("30.00")
        )

        # First verification succeeds: 50 - 30 = 20 TC remaining
        txn1.verify()
        self.assertTrue(txn1.seller_verified)
        self.user_b.refresh_from_db()
        self.assertEqual(self.user_b.time_credits, Decimal("20.00"))

        # Second verification fails: remaining 20 TC < 30 TC required
        with self.assertRaises(ValueError) as ctx:
            txn2.verify()
        self.assertIn("Buyer does not have enough Time Credits", str(ctx.exception))

        # Balance remains 20.00 and is never negative
        self.user_b.refresh_from_db()
        self.assertEqual(self.user_b.time_credits, Decimal("20.00"))
        self.assertFalse(txn2.seller_verified)

    # --- AUDIT 4 & 5: Listing & Transaction Authorization ---
    def test_anonymous_and_authenticated_listing_access(self):
        """Anonymous and authenticated users can view listings, but only owner can edit."""
        anon_client = APIClient()
        res_anon = anon_client.get(f"/api/listings/{self.listing_a.id}/")
        self.assertEqual(res_anon.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.user_b)
        res_auth = self.client.get(f"/api/listings/{self.listing_a.id}/")
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)

        # User B edit attempt -> 403
        res_edit = self.client.put(f"/api/listings/{self.listing_a.id}/", {
            "title": "Malicious edit",
            "description": "Exploit"
        })
        self.assertEqual(res_edit.status_code, status.HTTP_403_FORBIDDEN)

    # --- AUDIT 7: WebSocket Malformed / Path Traversal Room Name Rejection ---
    def test_websocket_rejects_malformed_room_names(self):
        """Verify parser rejects path traversal and unintended room formats."""
        bad_rooms = [
            "../../../etc/passwd",
            "txn-abc",
            "listing--buyer-",
            "arbitrary_admin_room",
            "txn-9999999",  # Nonexistent transaction
        ]
        for bad_room in bad_rooms:
            res = verify_user_room_access(self.user_a, bad_room)
            self.assertIsNone(res, f"Room {bad_room} should have been rejected")

    # --- AUDIT 9: Mass Assignment Protections ---
    def test_mass_assignment_protection_on_registration_and_profile(self):
        """Privileged fields like is_staff, is_superuser, and time_credits cannot be mass-assigned."""
        # 1. Registration attempt with privileged flags
        res_reg = self.client.post("/api/users/register/", {
            "username": "hacker_user",
            "email": "hacker@test.com",
            "password": "Password123!",
            "is_staff": True,
            "is_superuser": True,
            "time_credits": 999999.00
        })
        self.assertEqual(res_reg.status_code, status.HTTP_200_OK)
        created_user = User.objects.get(username="hacker_user")
        self.assertFalse(created_user.is_staff)
        self.assertFalse(created_user.is_superuser)
        self.assertEqual(created_user.time_credits, Decimal("100.00"))  # Model default

        # 2. Profile update attempt with privileged flags
        self.client.force_authenticate(user=created_user)
        res_put = self.client.put("/api/user/me/", {
            "password": "Password123!",
            "is_staff": True,
            "is_superuser": True,
            "time_credits": 999999.00
        })
        self.assertEqual(res_put.status_code, status.HTTP_200_OK)
        created_user.refresh_from_db()
        self.assertFalse(created_user.is_staff)
        self.assertFalse(created_user.is_superuser)
        self.assertEqual(created_user.time_credits, Decimal("100.00"))


# ---------------------------------------------------------
# PHASE 3 TESTS — AUTHENTICATION & OPERATIONAL SECURITY
# ---------------------------------------------------------
import asyncio
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from project.core.middleware import JwtAuthMiddlewareInstance
from django.contrib.auth.models import AnonymousUser


class JWTAuthenticationLifecycleTests(TestCase):
    """Test JWT authentication lifecycle, rotation, blacklisting, and logout."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="jwt_user",
            email="jwt_user@example.com",
            password="StrongPassword123!"
        )

    def tearDown(self):
        cache.clear()

    def test_login_returns_token_pair(self):
        """Login returns both access and refresh tokens."""
        res = self.client.post("/api/auth/login/", {
            "username": "jwt_user",
            "password": "StrongPassword123!"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_refresh_token_rotation_and_blacklisting(self):
        """Refresh endpoint issues a new refresh token and blacklists the previous one."""
        # 1. Login to get initial pair
        login_res = self.client.post("/api/auth/login/", {
            "username": "jwt_user",
            "password": "StrongPassword123!"
        })
        initial_refresh = login_res.data["refresh"]

        # 2. Use refresh token to get new tokens
        refresh_res = self.client.post("/api/auth/refresh/", {
            "refresh": initial_refresh
        })
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_res.data)
        self.assertIn("refresh", refresh_res.data)
        new_refresh = refresh_res.data["refresh"]
        self.assertNotEqual(initial_refresh, new_refresh)

        # 3. Attempt to reuse initial refresh token -> must be rejected (blacklisted)
        reuse_res = self.client.post("/api/auth/refresh/", {
            "refresh": initial_refresh
        })
        self.assertEqual(reuse_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        """Logout endpoint invalidates the refresh token."""
        login_res = self.client.post("/api/auth/login/", {
            "username": "jwt_user",
            "password": "StrongPassword123!"
        })
        refresh_token = login_res.data["refresh"]
        access_token = login_res.data["access"]

        # Logout with auth header and refresh token in payload
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_res = self.client.post("/api/auth/logout/", {
            "refresh": refresh_token
        })
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempt to refresh with the blacklisted token -> 401
        self.client.credentials()  # clear credentials
        refresh_res = self.client.post("/api/auth/refresh/", {
            "refresh": refresh_token
        })
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_or_tampered_token_rejected(self):
        """Protected endpoint rejects invalid or tampered tokens."""
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.payload")
        res = self.client.get("/api/user/me/")
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class PasswordPolicyTests(TestCase):
    """Test Django password validation enforcement on registration."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_reject_short_password(self):
        """Passwords shorter than 8 characters must be rejected."""
        res = self.client.post("/api/users/register/", {
            "username": "short_pw_user",
            "email": "short@example.com",
            "password": "p"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

    def test_reject_numeric_password(self):
        """Passwords entirely numeric must be rejected."""
        res = self.client.post("/api/users/register/", {
            "username": "num_pw_user",
            "email": "num@example.com",
            "password": "12345678901234"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

    def test_reject_common_password(self):
        """Common passwords must be rejected."""
        res = self.client.post("/api/users/register/", {
            "username": "common_pw_user",
            "email": "common@example.com",
            "password": "password"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

    def test_accept_strong_password(self):
        """Strong password meeting all criteria succeeds."""
        res = self.client.post("/api/users/register/", {
            "username": "strong_pw_user",
            "email": "strong@example.com",
            "password": "Complex#Password_2026!Secure"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(username="strong_pw_user").exists())


class AuthenticationThrottlingTests(TestCase):
    """Test rate limiting on authentication endpoints."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="throttle_user",
            password="StrongPassword123!"
        )

    def tearDown(self):
        cache.clear()

    def test_login_throttling_exceeded(self):
        """Exceeding the auth throttle rate limit returns 429 Too Many Requests."""
        # 10 requests are allowed per minute by default for 'auth' scope
        for _ in range(10):
            res = self.client.post("/api/auth/login/", {
                "username": "throttle_user",
                "password": "WrongPassword!"
            })
        # 11th request should be throttled
        throttled_res = self.client.post("/api/auth/login/", {
            "username": "throttle_user",
            "password": "WrongPassword!"
        })
        self.assertEqual(throttled_res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class DummyAsgiApp:
    def __init__(self, scope):
        self.scope = scope

    async def __call__(self, receive, send):
        return self.scope


class WebSocketAuthenticationMiddlewareTests(TransactionTestCase):
    """Test Channels JWT authentication middleware."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="ws_user",
            password="StrongPassword123!"
        )

    def tearDown(self):
        cache.clear()
        from channels.db import database_sync_to_async
        from django.db import connections
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(database_sync_to_async(connections.close_all)())
        finally:
            loop.close()
        connections.close_all()

    @classmethod
    def tearDownClass(cls):
        from channels.db import database_sync_to_async
        from django.db import connections
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(database_sync_to_async(connections.close_all)())
        finally:
            loop.close()
        connections.close_all()
        super().tearDownClass()

    def test_middleware_authenticates_valid_jwt(self):
        """Middleware populates scope['user'] when a valid JWT token query param is provided."""
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)

        scope = {
            "type": "websocket",
            "query_string": f"token={access_token}".encode("utf-8")
        }
        instance = JwtAuthMiddlewareInstance(scope, DummyAsgiApp)

        async def dummy_receive():
            pass

        async def dummy_send(msg):
            pass

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            res_scope = loop.run_until_complete(instance(dummy_receive, dummy_send))
            self.assertEqual(res_scope["user"].pk, self.user.pk)
        finally:
            loop.close()

    def test_middleware_handles_missing_token(self):
        """Middleware sets scope['user'] to AnonymousUser when no token is present."""
        scope = {
            "type": "websocket",
            "query_string": b""
        }
        instance = JwtAuthMiddlewareInstance(scope, DummyAsgiApp)

        async def dummy_receive():
            pass

        async def dummy_send(msg):
            pass

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            res_scope = loop.run_until_complete(instance(dummy_receive, dummy_send))
            self.assertTrue(res_scope["user"].is_anonymous)
        finally:
            loop.close()

    def test_middleware_handles_invalid_token(self):
        """Middleware sets scope['user'] to AnonymousUser when token is invalid/tampered."""
        scope = {
            "type": "websocket",
            "query_string": b"token=tampered_or_invalid_jwt_string"
        }
        instance = JwtAuthMiddlewareInstance(scope, DummyAsgiApp)

        async def dummy_receive():
            pass

        async def dummy_send(msg):
            pass

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            res_scope = loop.run_until_complete(instance(dummy_receive, dummy_send))
            self.assertTrue(res_scope["user"].is_anonymous)
        finally:
            loop.close()


