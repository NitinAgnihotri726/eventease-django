from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # If you have no signals for the new design, you can remove or comment this out.
        # import core.signals
        pass
