# core/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from core.models import ChatRoom, ChatMessage, SkillListing
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        route = self.scope.get("url_route", {})
        kwargs = route.get("kwargs", {})
        self.room_name = kwargs.get("room_name")
        self.group_name = f"chat_{self.room_name}"


        # Accept connection only if user authenticated
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return

        # Ensure chatroom exists or create for listing
        await sync_to_async(ChatRoom.objects.get_or_create)(room_name=self.room_name)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
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
            return

        data = json.loads(text_data)
        msg_type = data.get("type", "message")
        if msg_type == "message":
            content = data.get("message", "").strip()
            if not content:
                return

            # store message
            msg_obj = await sync_to_async(ChatMessage.objects.create)(
                room=await sync_to_async(ChatRoom.objects.get)(room_name=self.room_name),
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
            await self.channel_layer.group_send(self.group_name, {"type": "broadcast.message", "payload": payload})

    async def broadcast_message(self, event):
        payload = event["payload"]
        await self.send(text_data=json.dumps(payload))
