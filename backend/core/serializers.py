from rest_framework import serializers
from .models import User, SkillListing, Transaction, ChatMessage


# -----------------------------
# 1. PUBLIC USER SERIALIZER
# -----------------------------
class PublicUserSerializer(serializers.ModelSerializer):
    """
    Public profile data safe for unauthenticated and public viewing.
    Excludes email, phone, upi_id, upi_qr, time_credits, and bought_listings.
    """
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "bio",
        ]


# -----------------------------
# 2. PRIVATE USER SERIALIZER
# -----------------------------
class PrivateUserSerializer(serializers.ModelSerializer):
    """
    Private user profile data accessible only to the authenticated user on /api/user/me/.
    """
    bought_listings = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "bio",
            "upi_id",
            "upi_qr",
            "time_credits",
            "bought_listings",
        ]
        read_only_fields = [
            "id",
            "time_credits",
            "bought_listings",
        ]

    def get_bought_listings(self, obj):
        # Return a list of listing IDs where the user is the buyer and transaction is completed
        return list(
            obj.buyer_transactions.filter(seller_verified=True).values_list("listing_id", flat=True)
        )


# Backward compatibility alias
UserSerializer = PrivateUserSerializer


# -----------------------------
# 3. TRANSACTION PARTICIPANT SERIALIZER
# -----------------------------
class TransactionSellerSerializer(serializers.ModelSerializer):
    """
    Seller profile information shared with the buyer during transaction payment fulfillment.
    Includes UPI payment details when necessary, but excludes email, phone, time_credits, and bought_listings.
    """
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "bio",
            "upi_id",
            "upi_qr",
        ]


# -----------------------------
# 4. SKILL LISTING SERIALIZER
# -----------------------------
class SkillListingSerializer(serializers.ModelSerializer):
    provider = PublicUserSerializer(read_only=True)

    def validate_price_rupees(self, value):
        if value is None:
            return value
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('price_rupees must be a valid number')
        if v <= 0:
            raise serializers.ValidationError('price_rupees must be greater than 0')
        return value

    def validate_price_timecredits(self, value):
        if value is None:
            return value
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('price_timecredits must be a valid number')
        if v <= 0:
            raise serializers.ValidationError('price_timecredits must be greater than 0')
        return value

    class Meta:
        model = SkillListing
        fields = "__all__"


# -----------------------------
# 5. TRANSACTION SERIALIZER
# -----------------------------
class TransactionSerializer(serializers.ModelSerializer):
    buyer = PublicUserSerializer(read_only=True)
    seller = TransactionSellerSerializer(read_only=True)
    listing = SkillListingSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = "__all__"
        read_only_fields = [
            "seller_verified",
            "seller_verified_at",
            "seller_rejected",
            "seller_rejected_at",
            "buyer",
            "seller",
            "created_at",
        ]


# -----------------------------
# 6. CHAT MESSAGE SERIALIZER
# -----------------------------
class ChatMessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "content",
            "created_at",
        ]
