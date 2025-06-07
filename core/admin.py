from django.contrib import admin
from .models import Client, Vendor, EventRegistration

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'phone', 'created_at')

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'phone', 'created_at')

@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        'client',
        'event_name',
        'event_date',
        'event_package_name',
        'event_package_price',
        'vendor_package_name',
        'vendor_package_price',
        'payment_status',
        'created_at',
    )

