# core/middleware.py
import urllib.parse
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from rest_framework_simplejwt.tokens import UntypedToken
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
import jwt

User = get_user_model()

class JwtAuthMiddleware:
    """
    Middleware for Channels that authenticates the user from a `token` query parameter (JWT access token).
    For demo purposes only. In production, use secure cookie or wss + proper auth.
    """
    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return JwtAuthMiddlewareInstance(scope, self.inner)

class JwtAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = dict(scope)
        self.inner = inner

    async def __call__(self, receive, send):
        query_string = self.scope.get("query_string", b"").decode()
        params = urllib.parse.parse_qs(query_string)
        token_list = params.get("token") or params.get("access")
        user = AnonymousUser()

        if token_list:
            token = token_list[0]
            try:
                # Validate token (raises if invalid)
                UntypedToken(token)
                # Decode token to get user id
                decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = decoded.get("user_id") or decoded.get("user")
                if user_id:
                    try:
                        close_old_connections()
                        user = await get_user_async(user_id)
                    except Exception:
                        user = AnonymousUser()
            except Exception:
                user = AnonymousUser()

        self.scope["user"] = user
        inner = self.inner(self.scope)
        return await inner(receive, send)

# helper to fetch user in async
from asgiref.sync import sync_to_async
@sync_to_async
def get_user_async(uid):
    return User.objects.get(pk=uid)
