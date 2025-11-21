from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .models import User, SkillListing, Transaction, ChatRoom, ChatMessage
from .serializers import (
    UserSerializer,
    SkillListingSerializer,
    TransactionSerializer,
    ChatMessageSerializer,
)

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny


# -----------------------------------------------------
# LISTING VIEWSET
# -----------------------------------------------------
class ListingViewSet(viewsets.ModelViewSet):
    queryset = SkillListing.objects.all().order_by("-created_at")
    serializer_class = SkillListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(provider=self.request.user)

    def perform_update(self, serializer):
        listing = self.get_object()
        if listing.provider != self.request.user:
            raise ValidationError("You can only update your own listings.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.provider != self.request.user:
            raise ValidationError("You can only delete your own listings.")
        instance.delete()


# -----------------------------------------------------
# TRANSACTION VIEWSET
# -----------------------------------------------------
class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by("-created_at")
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(
            Q(buyer=user) | Q(seller=user)
        ).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Buyer creates a transaction.
        If payment_method = TC -> deduct TC & auto-complete.
        If payment_method = UPI -> normal flow.
        """
        req = self.request  # IMPORTANT
        listing_id = req.data.get("listing")
        payment_method = req.data.get("payment_method", "UPI")

        listing = get_object_or_404(SkillListing, id=listing_id)
        buyer = req.user
        seller = listing.provider

        # ---------------------------
        # TIME CREDIT PAYMENT
        # ---------------------------
        if payment_method == "TC":
            tc_amount = listing.price_timecredits

            if tc_amount is None:
                raise ValidationError("Listing does not support Time Credit payment.")

            if buyer.time_credits < tc_amount:
                raise ValidationError("Not enough Time Credits to complete transaction.")

            # Deduct and credit TC
            buyer.time_credits -= tc_amount
            buyer.save()

            seller.time_credits += tc_amount
            seller.save()

            # Save transaction as completed
            txn = serializer.save(
                buyer=buyer,
                seller=seller,
                listing=listing,
                payment_method="TC",
                tc_amount=tc_amount,
                buyer_txn_id=None,
                seller_verified=True,
                seller_verified_at=timezone.now(),
            )

            return txn

        # ---------------------------
        # UPI PAYMENT (default)
        # ---------------------------
        serializer.save(
            buyer=buyer,
            seller=seller,
            listing=listing,
            payment_method="UPI",
        )



    # ---- Buyer submits UPI Transaction ID ----
    @action(detail=True, methods=["POST"])
    def submit_txnid(self, request, pk=None):
        txn = self.get_object()
        if txn.buyer != request.user:
            return Response({"error": "Only the buyer can submit transaction IDs."}, status=403)
        if txn.payment_method != "UPI":
            return Response({"error": "Transaction ID only applies to UPI payments."}, status=400)
        if txn.buyer_txn_id:
            return Response({"error": "Transaction ID already submitted."}, status=400)
        txn.buyer_txn_id = request.data.get("buyer_txn_id")
        txn.save()
        return Response({"status": "Transaction ID saved"})

    # ---- Seller verifies ----
    @action(detail=True, methods=["POST"])
    def verify(self, request, pk=None):
        txn = self.get_object()

        if txn.seller != request.user:
            return Response({"error": "Only seller can verify"}, status=403)
        if txn.seller_verified:
            return Response({"error": "Transaction already verified."}, status=400)

        txn.verify()
        return Response({"status": "Transaction verified"})

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "username and password required"}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({"error": "username already exists"}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        return Response({"message": "User registered successfully"})

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        user = request.user
        user.upi_id = request.data.get("upi_id", user.upi_id)
        user.phone = request.data.get("phone", user.phone)
        user.bio = request.data.get("bio", user.bio)

        if "upi_qr" in request.FILES:
            user.upi_qr = request.FILES["upi_qr"]

        user.save()
        return Response(UserSerializer(user).data)


class ChatThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_room(self, listing):
        room_name = f"listing-{listing.id}"
        room, created = ChatRoom.objects.get_or_create(room_name=room_name, defaults={"listing": listing})
        if not created and room.listing is None:
            room.listing = listing
            room.save(update_fields=["listing"])
        return room

    def get(self, request, listing_id):
        listing = get_object_or_404(SkillListing, id=listing_id)
        room = self._get_room(listing)
        messages = room.messages.select_related("sender").order_by("-created_at")[:50]
        serialized = ChatMessageSerializer(reversed(messages), many=True)
        return Response(
            {
                "room": room.room_name,
                "listing": listing_id,
                "messages": serialized.data,
            }
        )

    def post(self, request, listing_id):
        listing = get_object_or_404(SkillListing, id=listing_id)
        content = request.data.get("message", "").strip()
        if not content:
            return Response({"error": "Message cannot be empty."}, status=400)

        room = self._get_room(listing)
        msg = ChatMessage.objects.create(room=room, sender=request.user, content=content)
        return Response(ChatMessageSerializer(msg).data, status=201)
