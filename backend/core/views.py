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
import re


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

        # Prevent self-purchase
        if buyer == seller:
            raise ValidationError("You cannot purchase your own listing.")

        # Prevent repeat purchases: if buyer already has a verified transaction for this listing
        already_done = Transaction.objects.filter(
            listing=listing, buyer=buyer, seller_verified=True
        ).exists()
        if already_done:
            raise ValidationError("You have already completed a purchase for this listing.")

        # If payment_method is TC, record tc_amount but do NOT deduct now.
        if payment_method == "TC":
            tc_amount = listing.price_timecredits
            if tc_amount is None:
                raise ValidationError("Listing does not support Time Credit payment.")
            txn = serializer.save(
                buyer=buyer,
                seller=seller,
                listing=listing,
                payment_method="TC",
                tc_amount=tc_amount,
                buyer_txn_id=None,
                seller_verified=False,
            )
            return txn

        # If payment_method is EX (exchange), create transaction and wait for seller confirmation
        if payment_method == "EX":
            txn = serializer.save(
                buyer=buyer,
                seller=seller,
                listing=listing,
                payment_method="EX",
            )
            return txn

        # Default: UPI payment (buyer will submit txn id, seller will verify)
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
        if txn.seller_rejected:
            return Response({"error": "Transaction already rejected."}, status=400)

        try:
            txn.verify()
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        return Response({"status": "Transaction verified"})

    # ---- Seller rejects ----
    @action(detail=True, methods=["POST"])
    def reject(self, request, pk=None):
        txn = self.get_object()

        if txn.seller != request.user:
            return Response({"error": "Only seller can reject"}, status=403)
        if txn.seller_verified:
            return Response({"error": "Transaction already verified."}, status=400)
        if txn.seller_rejected:
            return Response({"error": "Transaction already rejected."}, status=400)

        txn.reject()
        return Response({"status": "Transaction rejected"})

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
        
        # Verify password is provided and correct
        password = request.data.get("password")
        if not password:
            return Response({"error": "Password is required to update profile"}, status=400)
        
        if not user.check_password(password):
            return Response({"error": "Invalid password"}, status=400)
        
        # Update username if provided and not already taken
        new_username = request.data.get("username")
        if new_username and new_username != user.username:
            if User.objects.filter(username=new_username).exists():
                return Response({"error": "Username already exists"}, status=400)
            user.username = new_username
        
        # Update email if provided
        if "email" in request.data:
            user.email = request.data.get("email")
        
        # Update phone if provided
        if "phone" in request.data:
            user.phone = request.data.get("phone")
        
        # Update bio if provided
        if "bio" in request.data:
            user.bio = request.data.get("bio")
        
        # Update UPI fields if provided
        if "upi_id" in request.data:
            user.upi_id = request.data.get("upi_id")
        
        if "upi_qr" in request.FILES:
            user.upi_qr = request.FILES["upi_qr"]

        user.save()
        return Response(UserSerializer(user).data)



# --- Updated ChatThreadView for transaction-based chat ---
class ChatThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_room_by_transaction(self, transaction):
        room_name = f"txn-{transaction.id}"
        room, created = ChatRoom.objects.get_or_create(
            room_name=room_name,
            defaults={"transaction": transaction, "listing": transaction.listing},
        )
        if not created and (room.transaction is None or room.listing is None):
            room.transaction = transaction
            room.listing = transaction.listing
            room.save(update_fields=["transaction", "listing"])
        return room

    def _get_room_for_listing_buyer(self, listing, buyer_id):
        room_name = f"listing-{listing.id}-buyer-{buyer_id}"
        room, created = ChatRoom.objects.get_or_create(
            room_name=room_name,
            defaults={"listing": listing},
        )
        if not created and room.listing is None:
            room.listing = listing
            room.save(update_fields=["listing"])
        return room

    def get(self, request, listing_id=None, txn_id=None):
        # Transaction-based chat (private and persistent)
        if txn_id is not None:
            transaction = get_object_or_404(Transaction, id=txn_id)
            # Only buyer or seller can access
            if request.user != transaction.buyer and request.user != transaction.seller:
                return Response({"error": "Not authorized for this chat."}, status=403)
            room = self._get_room_by_transaction(transaction)
            messages = room.messages.select_related("sender").order_by("-created_at")[:50]
            serialized = ChatMessageSerializer(reversed(messages), many=True)
            return Response({"room": room.room_name, "transaction": txn_id, "messages": serialized.data})

        # Listing-based private chat per buyer (no public chats)
        if listing_id is not None:
            listing = get_object_or_404(SkillListing, id=listing_id)
            buyer_param = request.query_params.get("buyer_id")
            if buyer_param:
                try:
                    buyer_id_int = int(buyer_param)
                except (ValueError, TypeError):
                    return Response({"error": "Invalid buyer_id"}, status=400)
                # Seller can access any buyer room; buyer can access their own
                if request.user != listing.provider and request.user.id != buyer_id_int:
                    return Response({"error": "Not authorized for this chat."}, status=403)
                room = self._get_room_for_listing_buyer(listing, buyer_id_int)
            else:
                # No buyer_id: if requester is buyer, create/use their private room
                if request.user != listing.provider:
                    room = self._get_room_for_listing_buyer(listing, request.user.id)
                else:
                    return Response({"error": "buyer_id required for seller to fetch chats."}, status=400)

            messages = room.messages.select_related("sender").order_by("-created_at")[:50]
            serialized = ChatMessageSerializer(reversed(messages), many=True)
            return Response({"room": room.room_name, "listing": listing_id, "messages": serialized.data})

        return Response({"error": "Missing identifier"}, status=400)

    def post(self, request, listing_id=None, txn_id=None):
        content = request.data.get("message", "").strip()
        if not content:
            return Response({"error": "Message cannot be empty."}, status=400)

        if txn_id is not None:
            transaction = get_object_or_404(Transaction, id=txn_id)
            if request.user != transaction.buyer and request.user != transaction.seller:
                return Response({"error": "Not authorized for this chat."}, status=403)
            room = self._get_room_by_transaction(transaction)
            msg = ChatMessage.objects.create(room=room, sender=request.user, content=content)
            return Response(ChatMessageSerializer(msg).data, status=201)

        if listing_id is not None:
            listing = get_object_or_404(SkillListing, id=listing_id)
            buyer_id = request.data.get("buyer_id")
            if buyer_id:
                try:
                    buyer_id_int = int(buyer_id)
                except (ValueError, TypeError):
                    return Response({"error": "Invalid buyer_id"}, status=400)
                if request.user != listing.provider and request.user.id != buyer_id_int:
                    return Response({"error": "Not authorized for this chat."}, status=403)
                room = self._get_room_for_listing_buyer(listing, buyer_id_int)
            else:
                if request.user == listing.provider:
                    return Response({"error": "seller must provide buyer_id to post"}, status=400)
                room = self._get_room_for_listing_buyer(listing, request.user.id)

            msg = ChatMessage.objects.create(room=room, sender=request.user, content=content)
            return Response(ChatMessageSerializer(msg).data, status=201)

        return Response({"error": "Missing identifier"}, status=400)


class SellerBuyersView(APIView):
    """
    Get all buyers who have transactions with seller's listings, grouped by buyer and listing.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seller = request.user
        
        # Get all transactions where seller is the seller
        transactions = Transaction.objects.filter(seller=seller).select_related('buyer', 'listing').order_by('-created_at')
        
        # Group by buyer and listing
        buyer_listing_map = {}
        for txn in transactions:
            if not txn.buyer or not txn.listing:
                continue
            
            buyer_id = txn.buyer.id
            listing_id = txn.listing.id
            
            key = f"{buyer_id}_{listing_id}"
            if key not in buyer_listing_map:
                buyer_listing_map[key] = {
                    "buyer": UserSerializer(txn.buyer).data,
                    "listing": SkillListingSerializer(txn.listing).data,
                    "transaction": TransactionSerializer(txn).data,
                    "transactions": []
                }
            buyer_listing_map[key]["transactions"].append(TransactionSerializer(txn).data)
        
        # Convert to list
        # Also include chat rooms that are listing-specific (no transaction) so seller can see buyer-initiated chats
        rooms = ChatRoom.objects.filter(listing__provider=seller, transaction__isnull=True).select_related('listing')
        for room in rooms:
            # extract buyer id from room_name pattern listing-<id>-buyer-<buyer_id>
            buyer_id = None
            m = re.match(r"^listing-(\d+)-buyer-(\d+)$", room.room_name)
            if m:
                try:
                    buyer_id = int(m.group(2))
                except (ValueError, TypeError):
                    buyer_id = None
            # fallback: infer from latest message sender
            if buyer_id is None:
                last_msg = room.messages.order_by('-created_at').select_related('sender').first()
                if last_msg and last_msg.sender:
                    buyer_id = last_msg.sender.id

            if not buyer_id or not room.listing:
                continue

            key = f"{buyer_id}_{room.listing.id}"
            if key not in buyer_listing_map:
                try:
                    buyer_obj = User.objects.get(pk=buyer_id)
                except User.DoesNotExist:
                    continue
                # Provide a safe default transaction object so frontend can access fields without checks
                default_txn = {
                    "id": None,
                    "seller_rejected": False,
                    "seller_verified": False,
                    "seller_rejected_at": None,
                    "seller_verified_at": None,
                }
                buyer_listing_map[key] = {
                    "buyer": UserSerializer(buyer_obj).data,
                    "listing": SkillListingSerializer(room.listing).data,
                    "transaction": default_txn,
                    "chat_room": room.room_name,
                    "transactions": []
                }
            else:
                # ensure chat_room is present
                if "chat_room" not in buyer_listing_map[key] or not buyer_listing_map[key]["chat_room"]:
                    buyer_listing_map[key]["chat_room"] = room.room_name

        result = list(buyer_listing_map.values())

        return Response(result)
