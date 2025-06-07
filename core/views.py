import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Sum, Q, F
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.shortcuts import render, redirect, get_object_or_404
from .models import Client, Vendor, EventRegistration ,InvitedGuest, MonetaryGift , VendorOrder, FoodItem
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
import json, traceback
from django.utils import timezone
from django.views.decorators.http import require_POST
from datetime import date, timedelta,datetime
from django.template.loader import render_to_string
from xhtml2pdf import pisa
from django.urls import reverse
from django.core.serializers.json import DjangoJSONEncoder
import qrcode, base64
from django.http import HttpResponse
from django.db.models import Sum
from django.core.mail import EmailMultiAlternatives
import io
from email.mime.image import MIMEImage
from django.views     import View
from django.contrib.auth.decorators import login_required


# ---------------------------
# Page Views
# ---------------------------
def home(request):
    return render(request, 'home.html')

def signup_page(request):
    return render(request, 'signup.html')

def signin_page(request):
    return render(request, 'signin.html')

def client_dashboard(request):
    client_id = request.session.get('client_id')
    if not client_id:
        return redirect('/signin/?role=client&next=/dashboard/')
    try:
        client = Client.objects.get(client_id=client_id)
    except Client.DoesNotExist:
        return redirect('/signin/?role=client')
    # Retrieve the event registration record only for this client
    
    event_reg = EventRegistration.objects.filter(client=client).first()

    if event_reg and event_reg.event_date and event_reg.event_end_time:
        # 1) build naive end datetime
        end_naive = datetime.combine(event_reg.event_date, event_reg.event_end_time)
        # 2) get local “now” and strip tzinfo to make it naive
        now_local = timezone.localtime()           # aware
        now_naive = now_local.replace(tzinfo=None) # naive
        # 3) compare both naive
        if now_naive > end_naive + timedelta(days=1):
            InvitedGuest.objects.filter(event=event_reg).delete()
            MonetaryGift.objects.filter(event=event_reg).delete()
            event_reg.delete()
            event_reg = None

    if not event_reg:
        # If the client never created an event, just render an empty dashboard
        return render(request, 'dashboard.html', {
            'client_name': client.name,
            'client_username': client.username,
            'is_event_day': False,
            'chart_data': {'invites':{}, 'plates':{}, 'entry':{}},
            'steps': [],
            'event_registration': None,
        })

    
    guests_qs = InvitedGuest.objects.filter(event=event_reg)
    total_capacity = int(event_reg.event_size or 0)
    invited_count = guests_qs.filter(invitation_send_status=1).count()
    accepted_count = guests_qs.filter(invitation_accept_status=1).aggregate(
        total=Sum('accepted_members'))['total'] or 0
    pending_count = invited_count - accepted_count
    available_slots = total_capacity - invited_count

    # Plates – here we assume one plate per invited member
    plates_served = accepted_count
    plates_remaining = total_capacity - plates_served

    # Entry tracking
    entered_count = guests_qs.filter(checked_in=True).aggregate(
        total=Sum('accepted_members'))['total'] or 0
    not_entered_count = total_capacity - entered_count
    is_event_day = (event_reg.event_date == date.today())
    total_funds = event_reg.gifts.aggregate(total=Sum('amount'))['total'] or 0
    gifts = list(event_reg.gifts.values('guest_name','amount'))

    steps = [
      { 'name': 'Registered', 'time': event_reg.created_at,          'done': True },
      { 'name': 'Payment',    'time': event_reg.payment_time,         'done': bool(event_reg.payment_status) },
      { 'name': 'Event Start','time': datetime.combine(event_reg.event_date, event_reg.event_start_time) if event_reg.event_date else None,
        'done': event_reg.event_date and event_reg.event_date <= date.today() },
      { 'name': 'Completed',  'time': event_reg.payment_time and (
                              datetime.combine(event_reg.event_date, event_reg.event_end_time)
                              if event_reg.event_end_time else None),
        'done': event_reg.payment_status and event_reg.event_date and date.today() > event_reg.event_date }
    ]

    context = {
        'client_name': client.name,
        'client_username': client.username,
        'client_fullname': client.name,  # full name from client record
        'event_registration': event_reg,
        'total_funds': total_funds,
        'money_gifts': gifts,
        'max_guests': event_reg.event_size if event_reg and event_reg.event_size else 0,
        'chart_data': {
          'invites':     { 'accepted': accepted_count, 'pending': pending_count, 'available': available_slots },
          'plates':      { 'served': plates_served, 'remaining': plates_remaining },
          'entry':       { 'entered': entered_count, 'not_entered': not_entered_count }
        },
        'is_event_day': is_event_day,
        'steps': steps,
    }
    context['chart_data_json'] = json.dumps(context['chart_data'])
    # We need to convert datetime to string, so:
    context['steps_json'] = json.dumps([
        {
          'name': step['name'],
          'time': step['time'].isoformat() if step['time'] else None,
          'done': step['done']
        }
        for step in context['steps']
    ])
    return render(request, 'dashboard.html', context)

def compute_needed_and_salary(event_size_str, package_name, vendor_type_lower):
    try:
        size = int(event_size_str)
    except (TypeError, ValueError):
        return (0, 0)

    SALARY_RATES = {"chef": 2000, "waiter": 1000, "decoration": 1000}

    CHEF_MAPPING = {
        100: {
            "Standard Vendor Package":   2,
            "Premium Vendor Package":    4,
            "Exclusive Vendor Package":  5,
            "Grand Vendor Package":      7
        },
        200: {
            "Standard Vendor Package":   3,
            "Premium Vendor Package":    5,
            "Exclusive Vendor Package":  7,
            "Grand Vendor Package":     10
        },
        500: {
            "Standard Vendor Package":   7,
            "Premium Vendor Package":   10,
            "Exclusive Vendor Package": 12,
            "Grand Vendor Package":     15
        },
        1000: {
            "Standard Vendor Package":  10,
            "Premium Vendor Package":   15,
            "Exclusive Vendor Package": 20,
            "Grand Vendor Package":     25
        }
    }

    EVENT_MAPPING = {
        100: [
            {"name": "Standard Event Package",  "waiters": 5,  "decorators": 2},
            {"name": "Premium Event Package",   "waiters": 5,  "decorators": 3},
            {"name": "Exclusive Event Package", "waiters": 10, "decorators": 3},
            {"name": "Grand Event Package",     "waiters": 10, "decorators": 5},
        ],
        200: [
            {"name": "Standard Event Package",  "waiters": 10, "decorators": 3},
            {"name": "Premium Event Package",   "waiters": 15, "decorators": 5},
            {"name": "Exclusive Event Package", "waiters": 20, "decorators": 5},
            {"name": "Grand Event Package",     "waiters": 25, "decorators": 7},
        ],
        500: [
            {"name": "Standard Event Package",  "waiters": 25, "decorators": 7},
            {"name": "Premium Event Package",   "waiters": 30, "decorators": 10},
            {"name": "Exclusive Event Package", "waiters": 40, "decorators": 10},
            {"name": "Grand Event Package",     "waiters": 50, "decorators": 15},
        ],
        1000: [
            {"name": "Standard Event Package",  "waiters": 50,  "decorators": 15},
            {"name": "Premium Event Package",   "waiters": 75,  "decorators": 20},
            {"name": "Exclusive Event Package", "waiters": 100, "decorators": 20},
            {"name": "Grand Event Package",     "waiters": 125, "decorators": 30},
        ]
    }

    needed = 0
    salary = SALARY_RATES.get(vendor_type_lower, 0)

    if vendor_type_lower == "chef":
        needed = CHEF_MAPPING.get(size, {}).get(package_name, 0)
    elif vendor_type_lower in ["waiter", "decoration"]:
        for entry in EVENT_MAPPING.get(size, []):
            if entry["name"] == package_name:
                needed = entry["waiters"] if vendor_type_lower == "waiter" else entry["decorators"]
                break

    return (needed, salary)

def vendor_dashboard(request):
    vid = request.session.get('vendor_id')
    if not vid:
        return redirect('/signin/?role=vendor&next=/vendor/')

    vendor = get_object_or_404(Vendor, vendor_id=vid)

    # Has the vendor filled out the registration form?
    reg_submitted = bool(vendor.vendor_type and vendor.address and vendor.id_card)

    # Executive's decision flags
    if not reg_submitted:
        status = 'new'       # show registration form
    elif vendor.approved:
        status = 'approved'  # show dashboard
    elif vendor.rejection_reason:
        status = 'rejected'  # show rejection + reason
    else:
        status = 'pending'   # submitted & waiting

    context = {
        'vendor': vendor,
        'vendor_name': vendor.name,
        'vendor_username': vendor.username,
        'status': status,
        'reg_submitted': reg_submitted,
        'approved': vendor.approved,
        'rejected': bool(vendor.rejection_reason),
        'vendor_type': vendor.vendor_type,
    }
    return render(request, 'vendor.html', context)



def executive_dashboard(request):
    if not request.session.get('executive_id'):
        return redirect('/signin/?role=executive&next=/executive/')
    
    # --- Executive user info ---
    User = get_user_model()
    exec_user = User.objects.get(pk=request.session['executive_id'])
    executive_name = exec_user.get_full_name() or exec_user.username
    executive_role = "Executive Manager"
    
    # --- Dates & metrics ---
    today = date.today()
    first_of_this_month = today.replace(day=1)
    last_month_end = first_of_this_month - timedelta(days=1)
    first_of_last_month = last_month_end.replace(day=1)

    # 1) TOTAL EVENTS
    total_events = EventRegistration.objects.count()
    this_month_events = EventRegistration.objects.filter(
        created_at__date__gte=first_of_this_month
    ).count()
    last_month_events = EventRegistration.objects.filter(
        created_at__date__gte=first_of_last_month,
        created_at__date__lte=last_month_end
    ).count()
    total_pct_change = (
        (this_month_events - last_month_events) / last_month_events * 100
        if last_month_events else 0
    )

    # 2) ONGOING EVENTS (for cards)
    in_five_days = today + timedelta(days=5)
    ongoing_qs = EventRegistration.objects.filter(
        event_date__gte=today,
        event_date__lte=in_five_days
    )
    ongoing_count = ongoing_qs.count()
    starting_today = EventRegistration.objects.filter(event_date=today).count()

    # 3) VENDOR REGISTRATIONS
    submitted = Vendor.objects.filter(
        vendor_type__gt='',
        address__gt='',
        id_card__isnull=False
    )
    pending_vendor_apps = submitted.filter(approved=False, rejection_reason__exact='')
    registered_vendors   = submitted.filter(approved=True)

    # 4) REVENUE
    def revenue_qs(start, end):
        return EventRegistration.objects.filter(
            payment_status=True,
            event_date__gte=start,
            event_date__lte=end
        )
    agg_this = revenue_qs(first_of_this_month, today).aggregate(
        ep_sum=Sum('event_package_price'),
        vp_sum=Sum('vendor_package_price'),
        addons_sum=Sum('addon_food_items__price'),
    )
    this_month_revenue = sum(filter(None, agg_this.values()))
    agg_last = revenue_qs(first_of_last_month, last_month_end).aggregate(
        ep_sum=Sum('event_package_price'),
        vp_sum=Sum('vendor_package_price'),
        addons_sum=Sum('addon_food_items__price'),
    )
    last_month_revenue = sum(filter(None, agg_last.values()))
    revenue_pct_change = (
        (this_month_revenue - last_month_revenue) / last_month_revenue * 100
        if last_month_revenue else 0
    )

    # 5) RECENT EVENTS (next 2 days)
    in_two_days = today + timedelta(days=2)
    recent_events = EventRegistration.objects.filter(
        event_date__gte=today,
        event_date__lte=in_two_days
    ).values(
        'event_id','event_name','event_date','event_location','event_size'
    )

    # ——— Events Tabs ———
    ongoing_events   = ongoing_qs.order_by('event_date')
    upcoming_events  = EventRegistration.objects.filter(
        event_date__gt=in_five_days
    ).order_by('event_date')
    completed_events = EventRegistration.objects.filter(
        event_date__lt=today
    ).order_by('-event_date')


    paid_regs = EventRegistration.objects.filter(payment_status=True).select_related('client')
    unpaid_regs = EventRegistration.objects.filter(payment_status=False).select_related('client')

    paid_clients = []
    for r in paid_regs:
        paid_clients.append({
            'client_id':  r.client.client_id,
            'name':       r.client.name,
            'phone':      r.client.phone,
            'email':      r.client.email,
            'event_name': r.event_name,
            'total_paid': (r.event_package_price or 0) + (r.vendor_package_price or 0)
        })

    unpaid_clients = []
    for r in unpaid_regs:
        unpaid_clients.append({
            'client_id':  r.client.client_id,
            'name':       r.client.name,
            'phone':      r.client.phone,
            'email':      r.client.email,
            'event_name': r.event_name,
        })
    # ——— Build context ———
    context = {
        'executive_name':      executive_name,
        'paid_clients':        paid_clients,
        'unpaid_clients':      unpaid_clients,
        'executive_role':      executive_role,
        'total_events':        total_events,
        'total_pct_change':    round(total_pct_change,1),
        'ongoing_count':       ongoing_count,
        'starting_today':      starting_today,
        'pending_vendor_apps': pending_vendor_apps,
        'registered_vendors':  registered_vendors,
        'this_month_revenue':  this_month_revenue,
        'revenue_pct_change':  round(revenue_pct_change,1),
        'recent_events':       recent_events,

        # events for the 3 tabs
        'ongoing_events':   ongoing_events,
        'upcoming_events':  upcoming_events,
        'completed_events': completed_events,
    }
    return render(request, 'executive.html', context)

def executive_event_detail(request, event_id):
    # — Authentication —
    if not request.session.get('executive_id'):
        return redirect('/signin/?role=executive&next=/executive/')

    # — Fetch the event —
    event = get_object_or_404(EventRegistration, event_id=event_id)
    
    # — 1) Guest statistics —
    all_guests = InvitedGuest.objects.filter(event=event)
    total_invited_members = all_guests.aggregate(total=Sum('accepted_members'))['total'] or 0
    total_checked_in_members = all_guests.filter(checked_in=True)\
        .aggregate(total=Sum('accepted_members'))['total'] or 0
    
    guest_stats = {
        'invited':    total_invited_members,
        'checked_in': total_checked_in_members
    }
    # — 2) Timeline steps —
    timeline_steps = [
        {
            'name': 'Registered',
            'time': event.created_at.isoformat(),
            'done': True
        },
        {
            'name': 'Payment',
            'time': event.payment_time.isoformat() if event.payment_time else None,
            'done': bool(event.payment_status)
        },
        {
            'name': 'Event Start',
            'time': datetime.combine(event.event_date, event.event_start_time).isoformat()
                    if event.event_date and event.event_start_time else None,
            'done': bool(event.event_date and event.event_date <= date.today())
        },
        {
            'name': 'Event End',
            'time': datetime.combine(event.event_date, event.event_end_time).isoformat()
                    if event.event_date and event.event_end_time else None,
            'done': bool(event.payment_status and event.event_date and date.today() > event.event_date)
        }
    ]
    timeline_steps_json = json.dumps(timeline_steps, cls=DjangoJSONEncoder)

    # — 3) Finance: gifts collection over time —
    total_collected = event.gifts.aggregate(total=Sum('amount'))['total'] or 0
    finance = {
        'total':    float(total_collected),
        'received': float(total_collected),
        'pending':  0.0
    }
    # build daily time series
    daily_qs = (
        event.gifts
             .extra({'day': "date(created_at)"})
             .values('day')
             .annotate(amount=Sum('amount'))
             .order_by('day')
    )
    finance_chart = {
        'labels':   [row['day'].isoformat() for row in daily_qs],
        'datasets': [{
            'label': 'Funds Collected',
            'data':  [float(row['amount']) for row in daily_qs]
        }]
    }
    finance_chart_json = json.dumps(finance_chart, cls=DjangoJSONEncoder)

    # — 4) Vendor requirements & confirmations —
    # Mapping of key → vendor_type label
    VENDOR_TYPES = {
        'chef':       'Chef',
        'waiter':     'Waiter',
        'decoration': 'Decoration',
    }
    vendor_stats = {}
    vendor_chart = {'labels': [], 'datasets': [{'data': []}]}

    # Calculate needed & confirmed counts
    for key, label in VENDOR_TYPES.items():
        needed, _salary = compute_needed_and_salary(
            event.event_size or '0',
            event.vendor_package_name or '',
            key
        )
        confirmed_count = VendorOrder.objects.filter(
            event=event,
            vendor__vendor_type__iexact=label,
            accepted=True
        ).count()
        vendor_stats[key] = {
            'required':  needed,
            'confirmed': confirmed_count
        }
        vendor_chart['labels'].append(label)
        vendor_chart['datasets'][0]['data'].append(confirmed_count)

    vendor_chart_json = json.dumps(vendor_chart, cls=DjangoJSONEncoder)

    # — 5) List of confirmed vendors with salary —
    confirmed_qs = VendorOrder.objects.filter(
        event=event, accepted=True
    ).select_related('vendor')
    confirmed_vendors = []
    for order in confirmed_qs:
        v = order.vendor
        vt_lower = v.vendor_type.lower()
        # recompute salary per vendor slot
        _, salary = compute_needed_and_salary(
            event.event_size or '0', event.vendor_package_name or '', vt_lower
        )
        confirmed_vendors.append({
            'name':        v.name,
            'vendor_type': v.vendor_type,
            'salary':      salary
        })

    # — Build context & render —
    context = {
        'event':                 event,
        'timeline_steps':        timeline_steps,
        'finance':               finance,
        'finance_chart_json':    finance_chart_json,
        'timeline_steps_json':      timeline_steps_json,
        'vendor_stats':          vendor_stats,
        'vendor_chart_json':     vendor_chart_json,
        'confirmed_vendors':     confirmed_vendors,
        'total_invited_members': total_invited_members,
        'total_checked_in_members': total_checked_in_members,
    }
    return render(request, 'executive_event_detail.html', context)

# ---------------------------
# API Views
# ---------------------------
@csrf_exempt
def signup(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            role = data.get('role', 'client').lower().strip()
            name = data.get('name')
            username = data.get('username')
            email = data.get('email')
            phone = data.get('phone')
            password = data.get('password')
            hashed_password = make_password(password)
            if role == 'client':
                if Client.objects.filter(username__iexact=username).exists():
                    return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)
                if Client.objects.filter(email__iexact=email).exists():
                    return JsonResponse({'success': False, 'error': 'Email already exists'}, status=400)
                if Client.objects.filter(phone=phone).exists():
                    return JsonResponse({'success': False, 'error': 'Mobile number already exists'}, status=400)
                client = Client.objects.create(
                    name=name,
                    username=username,
                    email=email,
                    phone=phone,
                    password=hashed_password
                )
                request.session['client_id'] = client.client_id
                return JsonResponse({'success': True, 'redirect_url': '/client_dashboard/'})
            elif role == 'vendor':
                if Vendor.objects.filter(username__iexact=username).exists():
                    return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)
                if Vendor.objects.filter(email__iexact=email).exists():
                    return JsonResponse({'success': False, 'error': 'Email already exists'}, status=400)
                if Vendor.objects.filter(phone=phone).exists():
                    return JsonResponse({'success': False, 'error': 'Mobile number already exists'}, status=400)
                vendor = Vendor.objects.create(
                    name=name,
                    username=username,
                    email=email,
                    phone=phone,
                    password=hashed_password
                )
                request.session['vendor_id'] = vendor.vendor_id
                return JsonResponse({'success': True, 'redirect_url': '/vendor/'})
            else:
                return JsonResponse({'success': False, 'error': 'Invalid role'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Only POST method allowed'}, status=405)

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            role = data.get('role', 'client').lower().strip()
            login_val = data.get('login')
            password = data.get('password')
            print(f"[DEBUG] Login attempt: role={role}, login={login_val}")

            if role == 'client':
                client = Client.objects.filter(Q(username__iexact=login_val) | Q(email__iexact=login_val)).first()
                if client is None:
                    print("[DEBUG] Client not found")
                    return JsonResponse({'success': False, 'error': 'User not found'}, status=400)
                if check_password(password, client.password):
                    request.session['client_id'] = client.client_id
                    print("[DEBUG] Client login successful")
                    return JsonResponse({'success': True, 'redirect_url': '/dashboard/'})
                else:
                    return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=400)
            elif role == 'vendor':
                vendor = Vendor.objects.filter(Q(username__iexact=login_val) | Q(email__iexact=login_val)).first()
                if vendor is None:
                    print("[DEBUG] Vendor not found")
                    return JsonResponse({'success': False, 'error': 'User not found'}, status=400)
                if check_password(password, vendor.password):
                    request.session['vendor_id'] = vendor.vendor_id
                    print("[DEBUG] Vendor login successful")
                    return JsonResponse({'success': True, 'redirect_url': '/vendor/'})
                else:
                    return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=400)
            elif role == 'executive':
                user = authenticate(username=login_val, password=password)
                if user and user.is_superuser:
                    request.session['executive_id'] = user.id
                    request.session['executive_name'] = user.get_full_name()
                    print("[DEBUG] Executive login successful")
                    return JsonResponse({'success': True, 'redirect_url': '/executive/'})
                else:
                    print("[DEBUG] Executive login failed")
                    return JsonResponse({'success': False, 'error': 'Invalid executive credentials'}, status=400)
            else:
                return JsonResponse({'success': False, 'error': 'Invalid role provided'}, status=400)
        except Exception as e:
            print("[DEBUG] Exception in login_view:", e)
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Only POST method allowed'}, status=405)

def check_username(request):
    username = request.GET.get('username', '').strip()
    role = request.GET.get('role', 'client').strip().lower()
    if role == 'client':
        available = not Client.objects.filter(username__iexact=username).exists()
    elif role == 'vendor':
        available = not Vendor.objects.filter(username__iexact=username).exists()
    else:
        available = False
    return JsonResponse({'available': available})

def check_email(request):
    email = request.GET.get('email', '').strip()
    role = request.GET.get('role', 'client').strip().lower()
    if role == 'client':
        available = not Client.objects.filter(email__iexact=email).exists()
    elif role == 'vendor':
        available = not Vendor.objects.filter(email__iexact=email).exists()
    else:
        available = False
    return JsonResponse({'available': available})

def check_phone(request):
    phone = request.GET.get('phone', '').strip()
    role = request.GET.get('role', 'client').strip().lower()
    if role == 'client':
        available = not Client.objects.filter(phone=phone).exists()
    elif role == 'vendor':
        available = not Vendor.objects.filter(phone=phone).exists()
    else:
        available = False
    return JsonResponse({'available': available})

def client_event_detail(request, event_id):
    # ensure the client is logged in
    client = get_object_or_404(Client, client_id=request.session.get('client_id'))
    # fetch only their event
    event = get_object_or_404(EventRegistration, event_id=event_id, client=client)
    return render(request, 'EventEase.html', {
        'event': event,
        
    })

@csrf_exempt
def save_event(request):
    if request.method == 'POST':
        try:
            if not request.session.get('client_id'):
                return JsonResponse({'success': False, 'error': 'Authentication required'}, status=403)
            data = json.loads(request.body)
            section = data.get('section')
            event_data = data.get('data')
            client = Client.objects.get(client_id=request.session.get('client_id'))
            event_reg, created = EventRegistration.objects.get_or_create(client=client)
            if section == 'event_details':
                event_reg.event_name = event_data.get('event_name', event_reg.event_name)
                event_reg.event_type = event_data.get('event_type', event_reg.event_type)
                event_reg.event_date = event_data.get('event_date', event_reg.event_date)
                event_reg.event_start_time = event_data.get('event_start_time', event_reg.event_start_time)
                event_reg.event_end_time = event_data.get('event_end_time', event_reg.event_end_time)
                event_reg.event_location = event_data.get('event_location', event_reg.event_location)
                event_reg.event_size = event_data.get('event_size', event_reg.event_size)
                event_reg.event_package_name = event_data.get('selected_package', event_reg.event_package_name)
                event_reg.event_package_price = event_data.get('package_price', event_reg.event_package_price)
            elif section == 'vendor_registration':
                event_reg.vendor_details = json.dumps(event_data)
                event_reg.vendor_package_name = event_data.get('selected_vendor_package', event_reg.vendor_package_name)
                event_reg.vendor_package_price = event_data.get('vendor_package_price', event_reg.vendor_package_price)
            elif section == 'addons':
                 event_reg.addons = json.dumps(
                    event_data.get('selectedFoodItems', [])
                )
            elif section == 'guest_addition':
                event_reg.guest_list = event_data.get('guest_list', event_reg.guest_list)
            elif section == 'payment':
                event_reg.payment_details = json.dumps(event_data)
                event_reg.payment_status = True
            event_reg.save()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Only POST method allowed'}, status=405)


def load_event(request):
    try:
        if not request.session.get('client_id'):
            return JsonResponse({'success': False, 'error': 'Authentication required'}, status=403)
        client = Client.objects.get(client_id=request.session.get('client_id'))
        event_reg = EventRegistration.objects.filter(client=client).first()
        if event_reg:
            data = {
                'event_name': event_reg.event_name,
                'event_type': event_reg.event_type,
                'event_date': event_reg.event_date.isoformat() if event_reg.event_date else '',
                'event_start_time': event_reg.event_start_time.isoformat() if event_reg.event_start_time else '',
                'event_end_time': event_reg.event_end_time.isoformat() if event_reg.event_end_time else '',
                'event_location': event_reg.event_location,
                'event_size': event_reg.event_size,
                'selected_package': event_reg.event_package_name,
                'package_price': float(event_reg.event_package_price) if event_reg.event_package_price else 0,
                'vendor_package_name': event_reg.vendor_package_name,
                'vendor_package_price': float(event_reg.vendor_package_price) if event_reg.vendor_package_price else 0,
                'payment_status': event_reg.payment_status,
                'vendor_details': event_reg.vendor_details,
                'addons': event_reg.addons,
                'guest_list': event_reg.guest_list,
                'payment_details': event_reg.payment_details,
            }
            return JsonResponse({'success': True, 'data': data})
        else:
            return JsonResponse({'success': True, 'data': {}})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
@csrf_exempt
def api_load_guests(request):
    """
    Returns JSON array of all guests for the current client’s event.
    """
    if not request.session.get('client_id'):
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=403)

    client = Client.objects.get(client_id=request.session['client_id'])
    event  = EventRegistration.objects.filter(client=client).first()
    if not event:
        return JsonResponse({'success': True, 'guests': []})

    qs = InvitedGuest.objects.filter(event=event)
    guests = []
    for g in qs:
        guests.append({
            'guest_id':        g.guest_id,
            'guest_name':      g.guest_name,
            'contact':         g.contact,
            'email':           g.email,
            'guest_type':      g.guest_type,
            'max_companions':  g.max_companions,
            'invitation_send_status': g.invitation_send_status,
            'invitation_accept_status': g.invitation_accept_status,
            'accepted_members':        g.accepted_members,
            'decline_reason':          g.decline_reason or ""
        })
    return JsonResponse({'success': True, 'guests': guests})

@require_POST
def vendor_register_api(request):
    vid = request.session.get('vendor_id')
    vendor = Vendor.objects.get(vendor_id=vid)

    vendor.vendor_type = request.POST['vendor_type']
    vendor.address     = request.POST['address']
    vendor.id_card     = request.FILES['id_card']
    vendor.save()

    return redirect('vendor_dashboard')

@csrf_exempt
def vendor_approve_api(request):
    data = json.loads(request.body)
    v = Vendor.objects.get(vendor_id=data['vendor_id'])
    if data['approve']:
        v.approved = True
        v.rejection_reason = ''
    else:
        v.approved = False
        v.rejection_reason = data.get('reason','')
    v.save()
    return JsonResponse({'success': True})

@require_POST
def vendor_clear_rejection(request):
    vid = request.session.get('vendor_id')
    v = get_object_or_404(Vendor, vendor_id=vid)
    v.rejection_reason = ''
    v.vendor_type = ''
    v.address = ''
    v.id_card = None
    v.approved = False
    v.save()
    return redirect('vendor_dashboard')

@require_POST
def logout_api(request):
    request.session.flush()
    return JsonResponse({'success': True})

@csrf_exempt
def api_add_guest(request):
    if request.method == 'POST' and request.session.get('client_id'):
        data   = json.loads(request.body)
        client = Client.objects.get(client_id=request.session['client_id'])
        event  = EventRegistration.objects.get(client=client)

        guest = InvitedGuest.objects.create(
            guest_name     = data['guest_name'],
            contact        = data['guest_contact'],
            email          = data['guest_email'],
            guest_type     = data['guest_type'],
            max_companions = data['max_companions'] or 1,
            is_primary     = True,
            event          = event,
            client         = client
        )

        return JsonResponse({
            'success': True,
            'guest': {
                'guest_id'       : guest.guest_id,
                'guest_name'     : guest.guest_name,
                'contact'        : guest.contact,
                'email'          : guest.email,
                'guest_type'     : guest.guest_type,
                'max_companions' : guest.max_companions,
            }
        })
    return JsonResponse({'success': False}, status=400)

@csrf_exempt
def api_delete_guest(request, guest_id):
    if request.method == 'POST':
        guest = get_object_or_404(InvitedGuest, guest_id=guest_id)
        if guest.invitation_send_status == 0 or guest.invitation_accept_status == -1:
            guest.delete()
            return JsonResponse({'success': True})
    return JsonResponse({'success': False}, status=400)

@csrf_exempt
def api_send_invitation(request, guest_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST allowed'}, status=405)

    guest = get_object_or_404(InvitedGuest, guest_id=guest_id)
    event = guest.event

    try:
        # 1) Build the RSVP link
        rsvp_url = request.build_absolute_uri(
            reverse('invitation_response', args=[guest.guest_id])
        )

        # 2) Render the HTML email
        html_body = render_to_string('emails/invite_email.html', {
            'guest': guest,
            'event': event,
            'rsvp_url': rsvp_url,
        })

        # 3) Send the email
        email = EmailMessage(
            subject=f"Invitation to {event.event_name}",
            body=html_body,
            from_email='noreply@eventease.com',
            to=[guest.email],
        )
        email.content_subtype = 'html'
        email.send(fail_silently=False)

        # 4) Mark as sent
        guest.invitation_send_status = 1
        guest.save()

        return JsonResponse({'success': True})

    except Exception as e:
        # log to console / server logs
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    
def invitation_response(request, guest_id):
    """Render the public RSVP page."""
   
    guest = get_object_or_404(InvitedGuest, guest_id=guest_id)
    companion_range = range(1, guest.max_companions + 1)
    context = {
        'guest':                 guest,
        'companion_range':       companion_range,
        'initial_accept_status': guest.invitation_accept_status,
        'initial_decline_reason': guest.decline_reason or '',
    }
    if request.method == 'POST':
        return api_respond_invitation(request)
    return render(request, 'invitation.html', context)


@csrf_exempt
def api_respond_invitation(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST allowed'}, status=405)

    try:
        data    = json.loads(request.body)
        guest   = get_object_or_404(InvitedGuest, guest_id=data['guest_id'])
        response = data['response']
        members = data.get('members', [])

        if response == 'decline':
            guest.invitation_accept_status = -1
            guest.decline_reason = data.get('decline_reason','')
            guest.save()
            return JsonResponse({'success': True})

        # --- ACCEPT path ---
        # 1) mark and save the primary guest
        guest.invitation_accept_status = 1
        guest.accepted_members = len(members)
        guest.save()

        # 2) if they submitted any member info, update the primary
        if members:
            m0 = members[0]
            guest.guest_name    = m0['name']
            guest.age           = m0.get('age')
            guest.relation      = m0.get('relation')
            guest.is_primary    = True
            guest.primary_guest = None
            guest.save()

        # 3) create InvitedGuest records for each extra family member
        created_guests = [guest]
        for m in members[1:]:
            fam = InvitedGuest.objects.create(
                guest_name     = m['name'],
                contact        = guest.contact,
                email          = guest.email,
                guest_type     = guest.guest_type,
                age            = m.get('age'),
                relation       = m.get('relation'),
                max_companions = 1,
                is_primary     = False,
                primary_guest  = guest,
                event          = guest.event,
                client         = guest.client,
            )
            created_guests.append(fam)

        # 4) Now *after* you’ve built the full list, assemble the pass-emails
        buffers, contexts = [], []
        for g in created_guests:
            qr_data = g.guest_id
            buf = io.BytesIO()
            qrcode.make(qr_data).save(buf, format='PNG')
            buf.seek(0)
            cid = f"qr_{g.guest_id}"
            buffers.append((buf, cid))
            contexts.append({
                'guest':   g,
                'event':   g.event,
                'qr_cid':  cid,
            })

        # 5) render all the individual passes
        #    pass the `request` so template loaders & context processors
        #    that rely on it still work
        rendered_passes = [
            render_to_string('emails/pass.html', ctx, request=request)
            for ctx in contexts
        ]
        html = ''.join(rendered_passes)

        # 6) build and send the multipart email
        msg = EmailMultiAlternatives(
            subject    = f"Your Event Passes for {guest.event.event_name}",
            body       = f"Hello {guest.guest_name}, your passes are attached.",
            from_email = 'noreply@eventease.com',
            to         = [guest.email],
        )
        msg.attach_alternative(html, "text/html")
        for buf, cid in buffers:
            img = MIMEImage(buf.getvalue(), _subtype="png")
            img.add_header('Content-ID', f"<{cid}>")
            img.add_header('Content-Disposition', 'inline', filename=f"{cid}.png")
            msg.attach(img)

        msg.send(fail_silently=False)
        return JsonResponse({'success': True})

    except InvitedGuest.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Guest not found'}, status=404)
    except Exception as e:
        # Log the full stack trace so you can debug in future
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
@csrf_exempt
def api_add_gift(request):
    """
    POST JSON { guest_name, amount } → create a MonetaryGift
    """
    if request.method == 'POST' and request.session.get('client_id'):
        data = json.loads(request.body)
        client = Client.objects.get(client_id=request.session['client_id'])
        event = EventRegistration.objects.filter(client=client).first()
        if not event:
            return JsonResponse({'success': False, 'error': 'No event found'}, status=400)

        gift = MonetaryGift.objects.create(
            event=event,
            guest_name=data.get('guest_name','').strip(),
            amount=data.get('amount',0)
        )
        return JsonResponse({
            'success': True,
            'gift': {
                'guest_name': gift.guest_name,
                'amount': float(gift.amount)
            },
            'total_funds': float(event.gifts.aggregate(total=Sum('amount'))['total'] or 0)
        })
    return JsonResponse({'success': False, 'error': 'Authentication required'}, status=403)


@csrf_exempt
def vendor_orders_api(request):
    """
    Returns two lists of “cards” for the vendor dashboard:
      • service_orders: one slot‐card per needed service‐vendor
      • addon_orders: one card per available add-on stall (one chef per stall)
    
    Handles BOTH legacy format (list of strings) and new format (list of dicts).
    """
    vid = request.session.get('vendor_id')
    if not vid:
        return JsonResponse({'error': 'Authentication required'}, status=403)

    vendor = get_object_or_404(Vendor, vendor_id=vid)
    v_type_raw = vendor.vendor_type       # e.g. "Chef", "Waiter", "Decoration"
    v_type = v_type_raw.lower()           # "chef", "waiter", "decoration"
    today = date.today()

    service_cards = []
    addon_cards   = []

    # 1) Fetch all future events
    future_events = EventRegistration.objects.filter(event_date__gt=today)

    for ev in future_events:
        size_str = ev.event_size or ""
        pkg_name = ev.vendor_package_name or ""

        # ————— A) SERVICE ORDERS —————
        # If this exact vendor hasn’t already taken a “service” slot for this event:
        if not VendorOrder.objects.filter(
            event=ev, vendor=vendor, order_type='service'
        ).exists():
            needed, salary_per_vendor = compute_needed_and_salary(size_str, pkg_name, v_type)
            if needed > 0:
                # Count how many service‐orders (of this type) have already been accepted
                accepted_count = VendorOrder.objects.filter(
                    event=ev,
                    order_type='service',
                    accepted=True,
                    vendor__vendor_type__iexact=v_type_raw
                ).count()
                if accepted_count < needed:
                    service_cards.append({
                        'event_id':          ev.event_id,
                        'event_name':        ev.event_name,
                        'event_type':        ev.event_type,
                        'venue':             ev.event_location,
                        'event_date':        ev.event_date.isoformat(),
                        'event_timing':      f"{ev.event_start_time.strftime('%I:%M %p')} - {ev.event_end_time.strftime('%I:%M %p')}",
                        'needed':            needed,
                        'accepted_count':    accepted_count,
                        'salary_per_vendor': salary_per_vendor,
                        'order_type':        'service'
                    })

        # ————— B) ADD-ON FOOD (only for chefs) —————
        if v_type == 'chef' and ev.addons:
            try:
                raw_addons = json.loads(ev.addons)
            except (ValueError, TypeError):
                raw_addons = []

            # raw_addons can be a list of strings OR a list of dicts
            for entry in raw_addons:
                if isinstance(entry, str):
                    # Legacy format: "Paneer Butter Masala"
                    name = entry
                    qty = 1
                    # Look up FoodItem (if exists) to get true price
                    try:
                        fi = FoodItem.objects.get(name__iexact=name)
                        price = float(fi.price)
                    except FoodItem.DoesNotExist:
                        fi = None
                        price = 0.0

                elif isinstance(entry, dict):
                    # New format: {"name":"Paneer...", "quantity":2, "price":13000}
                    name = entry.get('name')
                    qty = int(entry.get('quantity', 0) or 0)
                    price = float(entry.get('price', 0) or 0)
                    try:
                        fi = FoodItem.objects.get(name__iexact=name)
                    except FoodItem.DoesNotExist:
                        fi = None
                else:
                    # If it’s neither str nor dict, skip it
                    continue

                # Create at most one “chef‐slot” card per food‐item per event
                # (If you want qty separate cards, remove the `break` below.)
                for _ in range(qty):
                    # If this vendor already accepted that exact (event, fi) add-on, skip
                    if fi and VendorOrder.objects.filter(
                        event=ev,
                        vendor=vendor,
                        addon_food=fi,
                        order_type='addon',
                        accepted=True
                    ).exists():
                        continue

                    # Count how many chefs have accepted this stall (food‐item) already
                    accepted_addon_count = VendorOrder.objects.filter(
                        event=ev,
                        addon_food=fi,
                        order_type='addon',
                        accepted=True
                    ).count()

                    # Only offer this stall if nobody has accepted it yet
                    if accepted_addon_count < 1:
                        needed_addon = 1
                        # Salary = 60% of the item price
                        salary_addon = int(round(price * 0.6))

                        addon_cards.append({
                            'event_id':          ev.event_id,
                            'event_name':        ev.event_name,
                            'venue':             ev.event_location,
                            'event_date':        ev.event_date.isoformat(),
                            'event_timing':      f"{ev.event_start_time.strftime('%I:%M %p')} - {ev.event_end_time.strftime('%I:%M %p')}",
                            'addon_food_name':   name,
                            'addon_food_id':     fi.food_id if fi else None,
                            'needed':            needed_addon,
                            'accepted_count':    accepted_addon_count,
                            'salary_per_vendor': salary_addon,
                            'order_type':        'addon'
                        })
                        # Break so that we do NOT create a second card for the same stall
                        break

    return JsonResponse({
        'service_orders': service_cards,
        'addon_orders':   addon_cards
    })

@csrf_exempt
def event_response_api(request):
    """Handle accept/reject and create/update VendorOrder."""
    vid = request.session.get('vendor_id')
    if not vid:
        return JsonResponse({'error':'Authentication required'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST only'}, status=405)

    data   = json.loads(request.body)
    vendor = get_object_or_404(Vendor, vendor_id=request.session['vendor_id'])
    ev     = get_object_or_404(EventRegistration, event_id=data['event_id'])
    accepted = bool(data.get('accept', False))
    reason   = data.get('reason', '')

    order_type = data.get('order_type','service')
    addon_food = None
    if order_type == 'addon' and data.get('addon_food_id'):
        addon_food = get_object_or_404(FoodItem, food_id=data['addon_food_id'])

    vo, _ = VendorOrder.objects.update_or_create(
        event=ev,
        vendor=vendor,
        addon_food=addon_food,
        defaults={'accepted': accepted, 'reason': reason, 'order_type': order_type}
    )
    return JsonResponse({'success': True})


@csrf_exempt
def vendor_events_api(request):
    vid = request.session.get('vendor_id')
    if not vid:
        return JsonResponse({'error':'Authentication required'}, status=403)
    
    vendor = get_object_or_404(Vendor, vendor_id=vid)
    v_type = vendor.vendor_type
    today  = date.today()
    
    events_out = []
    # Filter for ANY VendorOrder for this vendor, accepted=True
    vo_qs = VendorOrder.objects.filter(vendor=vendor, accepted=True)
    
    for vo in vo_qs:
        ev = vo.event
        
        # If event_date ≤ today AND (for service) accepted_count = needed, skip pending—still show in “Completed”
        # (We only want to send back accepted events grouped by status.)
        if ev.event_date < today:
            status = 'completed'
        elif ev.event_date == today:
            status = 'ongoing'
        else:
            status = 'upcoming'
        
        # Compute salary & extra fields so front‐end can display “event_salary”
        # 1) If “service”:
        if vo.order_type == 'service':
            size_str = ev.event_size or ""
            pkg_name = ev.vendor_package_name or ""
            needed, salary_per_vendor = compute_needed_and_salary(size_str, pkg_name, v_type)
            event_salary = salary_per_vendor  # per‐day salary, not total for all vendors
            # note: front‐end can multiply by number of “slots” if desired, but typically each card is one vendor’s view
        
        # 2) If “addon”:
        else:  # vo.order_type == 'addon'
            fi = vo.addon_food
            event_salary = int(round(float(fi.price) * 0.6)) if fi else 0
        
        events_out.append({
            'event_id':        ev.event_id,
            'event_name':      ev.event_name,
            'venue':           ev.event_location,
            'event_date':      ev.event_date.isoformat(),
            'event_timing':    f"{ev.event_start_time.strftime('%I:%M %p')} - {ev.event_end_time.strftime('%I:%M %p')}",
            'order_type':      vo.order_type,
            'addon_food_name': vo.addon_food.name if vo.addon_food else None,
            'salary':          event_salary,
            'status':          status
        })
    
    return JsonResponse({'events': events_out})

@csrf_exempt
def verify_qr_entry(request):
    """
    POST JSON { token: <guest_id>, event_id: <event_id> }
    → marks the guest as checked_in exactly once.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST allowed'}, status=405)

    try:
        data     = json.loads(request.body)
        guest_id = data.get('token')
        event_id = data.get('event_id')

        # ensure the guest exists for that exact event
        guest = InvitedGuest.objects.get(
            guest_id=guest_id,
            event__event_id=event_id
        )
    except InvitedGuest.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Invalid QR code or wrong event'
        }, status=404)

    # only first scan counts
    if guest.checked_in:
        return JsonResponse({
            'success': False,
            'message': 'Guest already checked in'
        })

    # mark as used
    guest.checked_in = True
    guest.save()

    return JsonResponse({
        'success':    True,
        'guest_name': guest.guest_name
    })

def generate_report(request, event_id):
    if not request.session.get('executive_id'):
        return HttpResponse('Unauthorized', status=403)

    event = get_object_or_404(EventRegistration, event_id=event_id)

    # Build guest data dicts
    raw_guests = InvitedGuest.objects.filter(event=event).select_related('primary_guest').order_by('created_at')
    attended_guests = []
    not_attended_guests = []

    for g in raw_guests:
        # Determine category
        category = "Primary" if g.is_primary else "Family Member"
        # Primary guest name or dash
        primary_name = g.primary_guest.guest_name if g.primary_guest else "-"
        # If you have no timestamp field for check-in, fall back to updated timestamp
        # Here we assume 'checked_in' flips on check-in; using 'updated_at' or you must add a field.
        checkin_time = g.created_at if g.checked_in else None

        guest_data = {
            'guest_id':      g.guest_id,
            'guest_name':    g.guest_name,
            'guest_type':    g.guest_type,
            'guest_category':category,
            'primary_name':  primary_name,
            'checkin_time':  checkin_time,
            'status':        g.invitation_accept_status,
            'checked_in':    g.checked_in,
        }

        if g.checked_in:
            attended_guests.append(guest_data)
        else:
            not_attended_guests.append(guest_data)

    total_guests    = len(raw_guests)
    guests_attended = len(attended_guests)

    # Gifts
    gifts = list(MonetaryGift.objects.filter(event=event).order_by('created_at'))
    total_funds = sum(g.amount for g in gifts)

    # Timeline
    timeline = [
        {'name':'Registered',  'time': event.created_at,                  'done': True},
        {'name':'Payment',     'time': event.payment_time,                'done': bool(event.payment_status)},
        {'name':'Event Start', 'time': datetime.combine(event.event_date, event.event_start_time)
                                  if event.event_date and event.event_start_time else '', 
                               'done': bool(event.event_date and event.event_date <= date.today())},
        {'name':'Event End',   'time': datetime.combine(event.event_date, event.event_end_time)
                                  if event.event_date and event.event_end_time else '', 
                               'done': bool(event.payment_status and event.event_date and date.today() > event.event_date)},
    ]

    # Vendors
    confirmed_qs = VendorOrder.objects.filter(event=event, accepted=True).select_related('vendor')
    confirmed_vendors = []
    for vo in confirmed_qs:
        v = vo.vendor
        _, salary = compute_needed_and_salary(
            event.event_size or '0',
            event.vendor_package_name or '',
            v.vendor_type.lower()
        )
        confirmed_vendors.append({
            'name':        v.name,
            'vendor_type': v.vendor_type,
            'salary':      salary
        })

    html = render_to_string('event_report.html', {
        'event':                event,
        'attended_guests':      attended_guests,
        'not_attended_guests':  not_attended_guests,
        'total_guests':         total_guests,
        'guests_attended':      guests_attended,
        'gifts':                gifts,
        'total_funds':          total_funds,
        'timeline':             timeline,
        'confirmed_vendors':    confirmed_vendors,
        'now':                  timezone.now(),
    })

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="report_{event_id}.pdf"'
    if pisa.CreatePDF(html, dest=response).err:
        return HttpResponse('Error generating PDF', status=500)
    return response