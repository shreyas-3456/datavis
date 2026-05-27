import httpx
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.httpx_client import AsyncOAuth2Client
from app.core.config import settings

# Patch AsyncOAuth2Client to always bind to 0.0.0.0 (IPv4 only)
# authlib doesn't expose transport kwargs so we patch the constructor
_original_init = AsyncOAuth2Client.__init__

def _patched_init(self, *args, **kwargs):
    kwargs["transport"] = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
    _original_init(self, *args, **kwargs)

AsyncOAuth2Client.__init__ = _patched_init

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
        "prompt": "select_account",
    },
)