import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
import core.routing
from core.middleware import JwtAuthMiddleware  # custom middleware we will add

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        URLRouter(
            core.routing.websocket_urlpatterns
        )
    ),
})
