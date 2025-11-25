from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import F


# ----------------------------------------------------------
# Custom User Model
# ----------------------------------------------------------
class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True)
    upi_id = models.CharField(max_length=200, blank=True, null=True)
    upi_qr = models.ImageField(upload_to="upi_qr/", blank=True, null=True)
    time_credits = models.DecimalField(max_digits=10, decimal_places=2, default=100)


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
        choices=[("TC", "Time Credits"), ("UPI", "UPI"), ("EX", "Exchange Skills")],
        default="UPI"
    )

    tc_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    buyer_txn_id = models.CharField(max_length=200, blank=True, null=True)

    seller_verified = models.BooleanField(default=False)
    seller_verified_at = models.DateTimeField(blank=True, null=True)
    seller_rejected = models.BooleanField(default=False)
    seller_rejected_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def verify(self):
        # Defensive checks
        if self.seller_verified:
            raise ValueError('Transaction already verified.')
        if self.seller_rejected:
            raise ValueError('Transaction already rejected.')

        # Use atomic transaction to avoid partial updates
        with transaction.atomic():
            # UPI: require buyer txn id before verification
            if self.payment_method == 'UPI':
                if not self.buyer_txn_id:
                    raise ValueError('Buyer transaction id not submitted.')

            # Time Credits: deduct TC now (ensure buyer has enough)
            if self.payment_method == 'TC':
                if self.tc_amount is None:
                    raise ValueError('No time credit amount set for this transaction.')

                # Attempt to deduct atomically using F expression; ensure enough balance
                updated = User.objects.filter(pk=self.buyer.pk, time_credits__gte=self.tc_amount).update(
                    time_credits=F('time_credits') - self.tc_amount
                )
                if not updated:
                    raise ValueError('Buyer does not have enough Time Credits.')

                # Credit seller if present
                if self.seller:
                    User.objects.filter(pk=self.seller.pk).update(
                        time_credits=F('time_credits') + self.tc_amount
                    )

            # EX: business logic for exchange can be implemented elsewhere; here we just mark verified

            # Mark verified & timestamps
            self.seller_verified = True
            self.seller_verified_at = timezone.now()
            self.seller_rejected = False
            self.seller_rejected_at = None
            self.save(update_fields=[
                'seller_verified', 'seller_verified_at', 'seller_rejected', 'seller_rejected_at'
            ])

    def reject(self):
        # Mark rejected; reject should not perform any payment transfers
        if self.seller_verified:
            raise ValueError('Transaction already verified; cannot reject.')
        if self.seller_rejected:
            raise ValueError('Transaction already rejected.')

        self.seller_rejected = True
        self.seller_rejected_at = timezone.now()
        self.seller_verified = False
        self.seller_verified_at = None
        self.save(update_fields=['seller_rejected', 'seller_rejected_at', 'seller_verified', 'seller_verified_at'])

    def __str__(self):
        return f"Transaction {self.id}"

class ChatRoom(models.Model):
    room_name = models.CharField(max_length=200, unique=True)
    listing = models.ForeignKey(SkillListing, on_delete=models.SET_NULL, null=True, blank=True)
    transaction = models.ForeignKey('Transaction', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.room_name

class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.content[:30]}"
