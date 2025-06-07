import random
from django.db import models
from django.utils import timezone

def generate_random_id():
    return ''.join(random.choices('0123456789', k=10))

class Client(models.Model):
    # Use client_id as the primary key (10-digit string)
    client_id = models.CharField(max_length=10, primary_key=True, default=generate_random_id, editable=False)
    name = models.CharField(max_length=255)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username

class InvitedGuest(models.Model):
    # Use guest_id as primary key (10-digit string)
    guest_id = models.CharField(max_length=10, primary_key=True, default=generate_random_id, editable=False)
    guest_name = models.CharField(max_length=255)
    contact = models.CharField(max_length=20)
    email = models.EmailField()
    guest_type = models.CharField(max_length=50)  # Normal, VIP, VVIP
    invitation_send_status = models.IntegerField(default=0)  # 0=not sent,1=sent
    invitation_accept_status = models.IntegerField(default=0)  # 0=pending,1=accepted,-1=rejected
    max_companions = models.IntegerField(default=1)     # including primary guest
    accepted_members = models.IntegerField(default=0)
    is_primary = models.BooleanField(default=True)
    age = models.IntegerField(null=True, blank=True)
    relation = models.CharField(max_length=50, null=True, blank=True)
    primary_guest = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='family_members'
    )
    decline_reason = models.TextField(blank=True, null=True)
    event = models.ForeignKey('EventRegistration', on_delete=models.CASCADE)
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    monetarygifts = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    checked_in = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.guest_id} - {self.guest_name}"

class Vendor(models.Model):
    vendor_id      = models.CharField(max_length=10, primary_key=True, default=generate_random_id, editable=False)
    name           = models.CharField(max_length=255)
    username       = models.CharField(max_length=150, unique=True)
    email          = models.EmailField(unique=True)
    phone          = models.CharField(max_length=20, unique=True)
    password       = models.CharField(max_length=128)
    vendor_type    = models.CharField(max_length=50, blank=True)       # NEW
    address        = models.TextField(blank=True)                      # NEW
    id_card        = models.FileField(upload_to='vendor_ids/', blank=True, null=True)  # NEW
    approved       = models.BooleanField(default=False)                # tracks verification
    rejection_reason = models.TextField(blank=True)                   # if rejected
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username

class EventRegistration(models.Model):
    event_id = models.CharField(max_length=10, primary_key=True, default=generate_random_id, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    event_name = models.CharField(max_length=255, blank=True, null=True)
    event_type = models.CharField(max_length=100, blank=True, null=True)
    event_date = models.DateField(blank=True, null=True)
    event_start_time = models.TimeField(blank=True, null=True)
    event_end_time = models.TimeField(blank=True, null=True)
    event_location = models.CharField(max_length=255, blank=True, null=True)
    event_size = models.CharField(max_length=50, blank=True, null=True)
    # Event package details
    event_package_name = models.CharField(max_length=255, blank=True, null=True)
    event_package_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # Vendor package details
    vendor_package_name = models.CharField(max_length=255, blank=True, null=True)
    vendor_package_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    vendor_details = models.TextField(blank=True, null=True)
    addons = models.TextField(blank=True, null=True)
    guest_list = models.TextField(blank=True, null=True)
    payment_details = models.TextField(blank=True, null=True)
    payment_status = models.BooleanField(default=False)
    payment_time    = models.DateTimeField(null=True, blank=True)
    addon_food_items = models.ManyToManyField('FoodItem', blank=True, related_name='event_registrations')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client.username} - {self.event_name}"

def generate_random_food_id():
    return ''.join(random.choices('0123456789', k=10))

class FoodItem(models.Model):
    food_id = models.CharField(max_length=10, unique=True, default=generate_random_food_id)
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class MonetaryGift(models.Model):
    id = models.AutoField(primary_key=True)
    event = models.ForeignKey(
        EventRegistration,
        on_delete=models.CASCADE,
        related_name='gifts'
    )
    guest_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.guest_name} – ₹{self.amount}"
    

class VendorOrder(models.Model):
    """
    Tracks a single vendor’s response (accept/reject)
    to an EventRegistration (service order) or FoodItem (add-on).
    """
    ORDER_TYPE_CHOICES = [
        ('service', 'Service'),
        ('addon', 'Add-On'),
    ]

    order_id    = models.CharField(max_length=10, primary_key=True,
                                   default=generate_random_id, editable=False)
    event       = models.ForeignKey('EventRegistration',
                                    on_delete=models.CASCADE,
                                    related_name='vendor_orders')
    vendor      = models.ForeignKey('Vendor',
                                    on_delete=models.CASCADE,
                                    related_name='orders')
    order_type  = models.CharField(max_length=10,
                                   choices=ORDER_TYPE_CHOICES)
    addon_food  = models.ForeignKey('FoodItem',
                                    on_delete=models.SET_NULL,
                                    null=True, blank=True)
    accepted    = models.BooleanField()
    reason      = models.TextField(blank=True)  # for rejections
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'vendor', 'addon_food')

    def __str__(self):
        return f"{self.vendor.username} → {self.event.event_id} ({self.order_type})"