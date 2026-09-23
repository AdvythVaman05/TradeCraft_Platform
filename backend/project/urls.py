from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import ThrottledTokenObtainPairView, ThrottledTokenRefreshView, LogoutView, health_check

urlpatterns = [
    # Health Check (Railway & Load Balancers)
    path('health/', health_check, name='health_check'),
    path('api/health/', health_check, name='api_health_check'),

    path('admin/', admin.site.urls),

    # Authentication & Token Lifecycle
    path('api/auth/login/', ThrottledTokenObtainPairView.as_view(), name='jwt_login'),
    path('api/auth/refresh/', ThrottledTokenRefreshView.as_view(), name='jwt_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='jwt_logout'),

    # Core APIs
    path('api/', include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
