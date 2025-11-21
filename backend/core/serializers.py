from rest_framework import serializers
from .models import User, SkillListing, Transaction, ChatMessage


# -----------------------------
# USER SERIALIZER
# -----------------------------
class UserSerializer(serializers.ModelSerializer):
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
        ]



# -----------------------------
# LISTING SERIALIZER
# -----------------------------
class SkillListingSerializer(serializers.ModelSerializer):
    provider = UserSerializer(read_only=True)

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
