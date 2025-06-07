from django.contrib import admin
from django.urls import path
from core import views
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from core.views import api_add_gift
from core.views import executive_event_detail
from core.views import generate_report


urlpatterns = [

    path('admin/', admin.site.urls),
    path('', views.home, name='home'),
    path('signup/', views.signup_page, name='signup'),
    path('signin/', views.signin_page, name='signin'),
    path('dashboard/', views.client_dashboard, name='client_dashboard'),
    path('client/', RedirectView.as_view(pattern_name='client_dashboard', permanent=False)),
    path('event/<str:event_id>/', views.client_event_detail, name='client_event_detail'),
    path('vendor/', views.vendor_dashboard, name='vendor_dashboard'),
    path('executive/', views.executive_dashboard, name='executive_dashboard'),
    path('api/signup/', views.signup, name='api_signup'),
    path('api/login/', views.login_view, name='api_login'),
    path('api/check-username/', views.check_username, name='api_check_username'),
    path('api/check-email/', views.check_email, name='api_check_email'),
    path('api/check-phone/', views.check_phone, name='api_check_phone'),
    path('api/save-event/', views.save_event, name='api_save_event'),
    path('api/load-event/', views.load_event, name='api_load_event'),
  
    path('api/vendor-register/', views.vendor_register_api, name='api_vendor_register'),
    path('api/vendor-clear-rejection/',views.vendor_clear_rejection,name='vendor_clear_rejection'),
    path('api/vendor-approve/', views.vendor_approve_api, name='api_vendor_approve'),
    path('api/add-guest/',          views.api_add_guest,         name='api_add_guest'),
    path('api/delete-guest/<str:guest_id>/', views.api_delete_guest, name='api_delete_guest'),
    path('api/send-invite/<str:guest_id>/',  views.api_send_invitation, name='api_send_invitation'),
    path("invitation/<str:guest_id>/", views.invitation_response, name="invitation_response"),
     
    path('api/respond-invitation/', views.api_respond_invitation, name='api_respond_invitation'),
    path('api/load-guests/', views.api_load_guests, name='api_load_guests'),
    path('api/add-gift/', api_add_gift, name='api_add_gift'),
    path('api/vendor-orders/',   views.vendor_orders_api,  name='api_vendor_orders'),
    path('api/event-response/',  views.event_response_api, name='api_event_response'),
    path('api/vendor-events/',   views.vendor_events_api,  name='api_vendor_events'),
    path('executive/event/<str:event_id>/', views.executive_event_detail, name='executive_event_detail'),
    path('executive/report/<int:event_id>/', generate_report, name='generate_report'),
    path('api/verify-qr-entry/', views.verify_qr_entry, name='verify_qr_entry'),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)