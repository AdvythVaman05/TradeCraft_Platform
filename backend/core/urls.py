from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ListingViewSet,
    TransactionViewSet,
    RegisterView,
    UserMeView,
)

router = DefaultRouter()
router.register("listings", ListingViewSet, basename="listings")
router.register("transactions", TransactionViewSet, basename="transactions")

urlpatterns = [
    path("", include(router.urls)),
    path("users/register/", RegisterView.as_view()),
    path("user/me/", UserMeView.as_view()),
]
