from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, SkillListing, Transaction, ChatRoom, ChatMessage


class CustomUserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("username", "email", "is_active", "is_staff", "time_credits")
    list_filter = ("is_active", "is_staff")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {
            "fields": ("email", "phone", "bio", "upi_id", "upi_qr", "time_credits")
        }),
        ("Permissions", {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")
        }),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "password1", "password2", "email", "time_credits", "is_active")
        }),
    )

    search_fields = ("username", "email")
    ordering = ("username",)


admin.site.register(User, CustomUserAdmin)
admin.site.register(SkillListing)
admin.site.register(Transaction)
admin.site.register(ChatRoom)
admin.site.register(ChatMessage)
