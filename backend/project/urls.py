from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('api/auth/login/', TokenObtainPairView.as_view(), name='jwt_login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='jwt_refresh'),

    # Core APIs
    path('api/', include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
