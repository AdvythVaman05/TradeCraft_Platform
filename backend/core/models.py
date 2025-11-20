from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# ----------------------------------------------------------
# Custom User Model
# ----------------------------------------------------------
class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True)
    upi_id = models.CharField(max_length=200, blank=True, null=True)
    upi_qr = models.ImageField(upload_to="upi_qr/", blank=True, null=True)
    time_credits = models.DecimalField(max_digits=10, decimal_places=2, default=0)


    def __str__(self):
        return self.username


# ----------------------------------------------------------
# Skill Listing
# ----------------------------------------------------------
class SkillListing(models.Model):
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listings")
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200, blank=True)
    price_rupees = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    price_timecredits = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)


    def __str__(self):
        return self.title


# ----------------------------------------------------------
# Transaction
# ----------------------------------------------------------
class Transaction(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="buyer_transactions")
    seller = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="seller_transactions")
    listing = models.ForeignKey(SkillListing, on_delete=models.SET_NULL, null=True)

    payment_method = models.CharField(
        max_length=20,
        choices=[("TC", "Time Credits"), ("UPI", "UPI")],
        default="UPI"
    )

    tc_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    buyer_txn_id = models.CharField(max_length=200, blank=True, null=True)

    seller_verified = models.BooleanField(default=False)
    seller_verified_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def verify(self):
        self.seller_verified = True
        self.seller_verified_at = timezone.now()
        self.save()

    def __str__(self):
        return f"Transaction {self.id}"

class ChatRoom(models.Model):
    room_name = models.CharField(max_length=200, unique=True)
    listing = models.ForeignKey(SkillListing, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.room_name

class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.content[:30]}"
