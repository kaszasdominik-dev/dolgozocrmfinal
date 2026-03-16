"""
Bulk Email Module - Gmail OAuth integration és email küldés
"""
import os
import base64
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Gmail API scopes
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid"
]

# Unsubscribe URL base
UNSUBSCRIBE_BASE_URL = "https://dolgozocrm.optimalcrew.hu"

# Daily email limit per Gmail account
DAILY_EMAIL_LIMIT = 500


def get_google_client_config():
    """Get Google OAuth client config from environment"""
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return None
    
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }


def create_oauth_flow(redirect_uri: str) -> Optional[Flow]:
    """Create OAuth flow for Gmail authorization"""
    client_config = get_google_client_config()
    if not client_config:
        return None
    
    flow = Flow.from_client_config(
        client_config,
        scopes=GMAIL_SCOPES,
        redirect_uri=redirect_uri
    )
    # Disable PKCE to avoid code_verifier issues
    flow.code_verifier = None
    return flow


def get_authorization_url(redirect_uri: str, state: str) -> Optional[str]:
    """Get Gmail authorization URL"""
    flow = create_oauth_flow(redirect_uri)
    if not flow:
        return None
    
    # Don't use PKCE (code_challenge) - simpler for server-side apps
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        state=state,
        include_granted_scopes='true'
    )
    return auth_url


async def exchange_code_for_tokens(code: str, redirect_uri: str) -> Optional[Dict]:
    """Exchange authorization code for tokens using direct HTTP request"""
    import requests
    
    logger.info(f"Exchanging code for tokens with redirect_uri: {redirect_uri}")
    
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        logger.error("OAuth credentials not configured")
        return None
    
    try:
        # Direct token exchange without PKCE
        token_response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            }
        )
        
        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: {token_response.text}")
            return None
        
        token_data = token_response.json()
        logger.info(f"Token fetched successfully, has refresh_token: {'refresh_token' in token_data}")
        
        # Create credentials to get user info
        creds = Credentials(
            token=token_data['access_token'],
            refresh_token=token_data.get('refresh_token'),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret
        )
        
        # Get user info
        service = build('oauth2', 'v2', credentials=creds)
        user_info = service.userinfo().get().execute()
        
        logger.info(f"User info retrieved: {user_info.get('email')}")
        
        return {
            "access_token": token_data['access_token'],
            "refresh_token": token_data.get('refresh_token'),
            "token_uri": 'https://oauth2.googleapis.com/token',
            "client_id": client_id,
            "client_secret": client_secret,
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600)),
            "email": user_info.get('email'),
            "name": user_info.get('name')
        }
    except Exception as e:
        logger.error(f"Error exchanging code for tokens: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None


async def get_gmail_credentials(token_data: Dict) -> Optional[Credentials]:
    """Get Gmail credentials from stored token data, refreshing if needed"""
    try:
        creds = Credentials(
            token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret")
        )
        
        # Check if token needs refresh
        expires_at = token_data.get("expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) >= expires_at - timedelta(minutes=5):
                creds.refresh(GoogleRequest())
                # Return new token data for updating in DB
                return creds, {
                    "access_token": creds.token,
                    "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
                }
        
        return creds, None
    except Exception as e:
        logger.error(f"Error getting Gmail credentials: {e}")
        return None, None


def generate_unsubscribe_token() -> str:
    """Generate unique unsubscribe token"""
    return secrets.token_urlsafe(32)


def create_email_with_unsubscribe(
    to_email: str,
    subject: str,
    body: str,
    from_email: str,
    unsubscribe_token: str
) -> MIMEMultipart:
    """Create email message with unsubscribe link"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    
    # Unsubscribe link
    unsubscribe_url = f"{UNSUBSCRIBE_BASE_URL}/leiratkozas/{unsubscribe_token}"
    
    # Plain text version
    text_content = f"""{body}

--
Amennyiben nem szeretne több állásajánlatot kapni, az alábbi linken tud leiratkozni:
{unsubscribe_url}
"""
    
    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        {body.replace(chr(10), '<br>')}
        
        <p style="font-size: 10px; font-style: italic; color: #999; text-align: center; margin-top: 40px;">
            Amennyiben nem szeretne több állásajánlatot kapni, 
            <a href="{unsubscribe_url}" style="color: #999; text-decoration: underline;">ezen a linken tud leiratkozni</a>.
        </p>
    </div>
</body>
</html>
"""
    
    text_part = MIMEText(text_content, 'plain', 'utf-8')
    html_part = MIMEText(html_content, 'html', 'utf-8')
    
    msg.attach(text_part)
    msg.attach(html_part)
    
    return msg


async def send_email_via_gmail(
    credentials: Credentials,
    to_email: str,
    subject: str,
    body: str,
    from_email: str,
    unsubscribe_token: str
) -> Dict:
    """Send single email via Gmail API"""
    try:
        service = build('gmail', 'v1', credentials=credentials)
        
        message = create_email_with_unsubscribe(
            to_email=to_email,
            subject=subject,
            body=body,
            from_email=from_email,
            unsubscribe_token=unsubscribe_token
        )
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        result = service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        
        return {
            "success": True,
            "message_id": result.get('id'),
            "thread_id": result.get('threadId')
        }
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def replace_template_variables(template: str, worker: Dict) -> str:
    """Replace template variables with worker data"""
    replacements = {
        "{név}": worker.get("name", ""),
        "{telefon}": worker.get("phone", ""),
        "{email}": worker.get("email", ""),
        "{lakóhely}": worker.get("address", ""),
        "{pozíció}": ", ".join(worker.get("position_names", [])) if worker.get("position_names") else "",
        "{megjegyzés}": worker.get("notes", ""),
    }
    
    result = template
    for key, value in replacements.items():
        result = result.replace(key, value or "")
    
    return result
