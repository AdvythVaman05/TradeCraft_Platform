from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env variables from backend/ or project root
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv()

# ---------------------------------------------------------
# 1. SECRET MANAGEMENT & DEBUG CONFIGURATION
# ---------------------------------------------------------
DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes", "t")

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "The SECRET_KEY environment variable must be set. "
        "Please configure SECRET_KEY in your environment or .env file."
    )

# Dedicated JWT signing key with explicit documented fallback to SECRET_KEY
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)


# ---------------------------------------------------------
# 2. HOST SECURITY
# ---------------------------------------------------------
raw_allowed_hosts = os.environ.get("ALLOWED_HOSTS", "")
if raw_allowed_hosts:
    ALLOWED_HOSTS = [h.strip() for h in raw_allowed_hosts.split(",") if h.strip()]
elif DEBUG:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
else:
    raise ImproperlyConfigured("ALLOWED_HOSTS environment variable must be set when DEBUG is False.")

if not DEBUG and "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS cannot contain wildcard '*' when DEBUG is False.")


# ---------------------------------------------------------
# 3. INSTALLED APPS
# ---------------------------------------------------------
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Local apps
    'core.apps.CoreConfig',
    'channels',
]


# ---------------------------------------------------------
# 4. MIDDLEWARE
# ---------------------------------------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be at the top
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ---------------------------------------------------------
# 5. CORS & CSRF CONFIGURATION
# ---------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = False

raw_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if raw_cors_origins:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]
elif DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
else:
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must be set when DEBUG is False.")

raw_csrf_origins = os.environ.get("CSRF_TRUSTED_ORIGINS", "")
if raw_csrf_origins:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in raw_csrf_origins.split(",") if origin.strip()]
elif DEBUG:
    CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
else:
    CSRF_TRUSTED_ORIGINS = []


# ---------------------------------------------------------
# 6. SECURITY HEADERS & SSL/COOKIE SETTINGS
# ---------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = os.environ.get("SECURE_REFERRER_POLICY", "strict-origin-when-cross-origin")
X_FRAME_OPTIONS = "DENY"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# SSL / HTTPS redirection
SECURE_SSL_REDIRECT = os.environ.get(
    "SECURE_SSL_REDIRECT",
    "False" if DEBUG else "True"
).lower() in ("true", "1", "yes")

# Reverse proxy SSL header (e.g. for Nginx / Render / Heroku / AWS ALB)
if not DEBUG and os.environ.get("SECURE_PROXY_SSL_HEADER", "True").lower() in ("true", "1", "yes"):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS settings (active in HTTPS production when SECURE_SSL_REDIRECT is True)
if SECURE_SSL_REDIRECT and not DEBUG:
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", 31536000))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get("SECURE_HSTS_INCLUDE_SUBDOMAINS", "True").lower() in ("true", "1", "yes")
    # Preload is disabled by default unless explicitly opted in
    SECURE_HSTS_PRELOAD = os.environ.get("SECURE_HSTS_PRELOAD", "False").lower() in ("true", "1", "yes")
else:
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", 0))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

# Cookies
SESSION_COOKIE_SECURE = os.environ.get(
    "SESSION_COOKIE_SECURE",
    "True" if (not DEBUG and SECURE_SSL_REDIRECT) else "False"
).lower() in ("true", "1", "yes")

CSRF_COOKIE_SECURE = os.environ.get(
    "CSRF_COOKIE_SECURE",
    "True" if (not DEBUG and SECURE_SSL_REDIRECT) else "False"
).lower() in ("true", "1", "yes")

SESSION_COOKIE_HTTPONLY = True
# Retain False by default for SPA compatibility if JS needs to read CSRF token
CSRF_COOKIE_HTTPONLY = os.environ.get("CSRF_COOKIE_HTTPONLY", "False").lower() in ("true", "1", "yes")

SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'


# ---------------------------------------------------------
# 7. PASSWORD VALIDATION
# ---------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ---------------------------------------------------------
# 8. URLS / WSGI / ASGI
# ---------------------------------------------------------
ROOT_URLCONF = 'project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'project.wsgi.application'
ASGI_APPLICATION = 'project.asgi.application'


# ---------------------------------------------------------
# 9. DATABASE — POSTGRESQL / SQLITE FALLBACK
# ---------------------------------------------------------
NEON_URL = os.environ.get("NEON_URL")
USE_SQLITE = os.environ.get("USE_SQLITE", "false").lower() in {"1", "true", "yes"}

if USE_SQLITE or not NEON_URL:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.parse(NEON_URL)
    }


# ---------------------------------------------------------
# 10. CHANNELS (WebSocket)
# ---------------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}


# ---------------------------------------------------------
# 11. REST FRAMEWORK, THROTTLING & JWT AUTHENTICATION
# ---------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.environ.get('THROTTLE_ANON_RATE', '100/minute'),
        'user': os.environ.get('THROTTLE_USER_RATE', '1000/minute'),
        'auth': os.environ.get('THROTTLE_AUTH_RATE', '10/minute'),
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

JWT_ACCESS_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_MINUTES', os.environ.get('JWT_ACCESS_MINUTES', 15)))
JWT_REFRESH_DAYS = int(os.environ.get('JWT_REFRESH_TOKEN_DAYS', os.environ.get('JWT_REFRESH_DAYS', 7)))

SIMPLE_JWT = {
    'SIGNING_KEY': JWT_SECRET_KEY,
    'ALGORITHM': 'HS256',
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=JWT_ACCESS_MINUTES),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=JWT_REFRESH_DAYS),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ---------------------------------------------------------
# 12. CUSTOM USER MODEL
# ---------------------------------------------------------
AUTH_USER_MODEL = 'core.User'


# ---------------------------------------------------------
# 13. STATIC / MEDIA CONFIGURATION
# ---------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
] if (BASE_DIR / 'static').exists() else []

# WhiteNoise storage in Django 5.1
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ---------------------------------------------------------
# 14. LOGGING CONFIGURATION
# ---------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [{name}] {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'core': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
