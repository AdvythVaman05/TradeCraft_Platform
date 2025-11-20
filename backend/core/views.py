from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import User, SkillListing, Transaction
from .serializers import UserSerializer, SkillListingSerializer, TransactionSerializer

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny


# -----------------------------------------------------
# LISTING VIEWSET
# -----------------------------------------------------
class ListingViewSet(viewsets.ModelViewSet):
    queryset = SkillListing.objects.all().order_by("-created_at")
    serializer_class = SkillListingSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        serializer.save(provider=self.request.user)


# -----------------------------------------------------
# TRANSACTION VIEWSET
# -----------------------------------------------------
class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by("-created_at")
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

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
                raise ValueError("Listing does not support Time Credit payment.")

            if buyer.time_credits < tc_amount:
                raise ValueError("Not enough Time Credits to complete transaction.")

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
        txn.buyer_txn_id = request.data.get("buyer_txn_id")
        txn.save()
        return Response({"status": "Transaction ID saved"})

    # ---- Seller verifies ----
    @action(detail=True, methods=["POST"])
    def verify(self, request, pk=None):
        txn = self.get_object()

        if txn.seller != request.user:
            return Response({"error": "Only seller can verify"}, status=403)

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
