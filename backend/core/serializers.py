from rest_framework import serializers
from .models import User, SkillListing, Transaction, ChatMessage


# -----------------------------
# USER SERIALIZER
# -----------------------------
class UserSerializer(serializers.ModelSerializer):
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

    def get_bought_listings(self, obj):
        # Return a list of listing IDs where the user is the buyer and transaction is completed
        return list(
            obj.buyer_transactions.filter(seller_verified=True).values_list("listing_id", flat=True)
        )



# -----------------------------
# LISTING SERIALIZER
# -----------------------------
class SkillListingSerializer(serializers.ModelSerializer):
    provider = UserSerializer(read_only=True)

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
# TRANSACTION SERIALIZER
# -----------------------------
class TransactionSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)

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


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "content",
            "created_at",
        ]
