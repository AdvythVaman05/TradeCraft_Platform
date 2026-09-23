import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from project.core.middleware import JwtAuthMiddleware
import project.core.routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        URLRouter(
            project.core.routing.websocket_urlpatterns
        )
    ),
})
