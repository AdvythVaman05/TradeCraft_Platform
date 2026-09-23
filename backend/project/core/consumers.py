# core/consumers.py
import json
import re
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import ChatRoom, ChatMessage, SkillListing, Transaction

User = get_user_model()


def verify_user_room_access(user, room_name):
    """
    Verifies that the authenticated user is an authorized participant in the requested chat room.
    Returns the ChatRoom instance if authorized, or None if unauthorized.
    """
    if not user or not user.is_authenticated:
        return None

    # Pattern 1: Transaction room (txn-<txn_id>)
    txn_match = re.match(r"^txn-(\d+)$", room_name)
    if txn_match:
        txn_id = int(txn_match.group(1))
        try:
            txn = Transaction.objects.select_related("buyer", "seller", "listing").get(pk=txn_id)
        except Transaction.DoesNotExist:
            return None

        # Only buyer or seller can participate
        if user != txn.buyer and user != txn.seller:
            return None

        room, created = ChatRoom.objects.get_or_create(
            room_name=room_name,
            defaults={"transaction": txn, "listing": txn.listing}
        )
        if not created and (room.transaction is None or room.listing is None):
            room.transaction = txn
            room.listing = txn.listing
            room.save(update_fields=["transaction", "listing"])
        return room

    # Pattern 2: Listing private chat room (listing-<listing_id>-buyer-<buyer_id>)
    listing_buyer_match = re.match(r"^listing-(\d+)-buyer-(\d+)$", room_name)
    if listing_buyer_match:
        listing_id = int(listing_buyer_match.group(1))
        buyer_id = int(listing_buyer_match.group(2))
        try:
            listing = SkillListing.objects.select_related("provider").get(pk=listing_id)
        except SkillListing.DoesNotExist:
            return None

        # Only the listing provider or the specific buyer can participate
        if user != listing.provider and user.id != buyer_id:
            return None

        room, created = ChatRoom.objects.get_or_create(
            room_name=room_name,
            defaults={"listing": listing}
        )
        if not created and room.listing is None:
            room.listing = listing
            room.save(update_fields=["listing"])
        return room

    # Pattern 3: Existing database room lookup with participant check
    try:
        room = ChatRoom.objects.select_related(
            "transaction__buyer", "transaction__seller", "listing__provider"
        ).get(room_name=room_name)
        if room.transaction:
            if user == room.transaction.buyer or user == room.transaction.seller:
                return room
        elif room.listing:
            m = re.match(r".*buyer-(\d+)", room_name)
            if m:
                b_id = int(m.group(1))
                if user == room.listing.provider or user.id == b_id:
                    return room
    except ChatRoom.DoesNotExist:
        pass

    return None


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        route = self.scope.get("url_route", {})
        kwargs = route.get("kwargs", {})
        self.room_name = kwargs.get("room_name")

        if not self.room_name:
            await self.close()
            return

        self.group_name = f"chat_{self.room_name}"
        user = self.scope.get("user")

        # Reject unauthenticated connections
        if not user or user.is_anonymous:
            await self.close()
            return

        # Verify user is an authorized participant of this specific room
        self.room = await database_sync_to_async(verify_user_room_access)(user, self.room_name)
        if not self.room:
            # Unauthorized room access attempt
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """
        Expect JSON messages:
        {
          "type": "message",
          "message": "text"
        }
        """
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return

        # Re-verify room participant authorization
        room = await database_sync_to_async(verify_user_room_access)(user, self.room_name)
        if not room:
            await self.close()
            return

        try:
            data = json.loads(text_data)
        except (ValueError, TypeError):
            return

        msg_type = data.get("type", "message")
        if msg_type == "message":
            content = data.get("message", "").strip()
            if not content:
                return

            # Store message
            msg_obj = await database_sync_to_async(ChatMessage.objects.create)(
                room=room,
                sender=user,
                content=content,
                created_at=timezone.now()
            )

            payload = {
                "type": "chat.message",
                "message": content,
                "sender": user.username,
                "sender_id": user.id,
                "created_at": msg_obj.created_at.isoformat(),
            }

            # Broadcast to group
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "broadcast.message", "payload": payload}
            )

    async def broadcast_message(self, event):
        payload = event["payload"]
        await self.send(text_data=json.dumps(payload))
