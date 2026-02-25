"""
Security utilities and middleware for CRM API
Includes: Rate limiting, password validation, audit logging
"""
import re
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

# ==================== PASSWORD VALIDATION ====================

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength with multiple criteria
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "A jelszó minimum 8 karakter legyen"
    
    if len(password) > 128:
        return False, "A jelszó maximum 128 karakter lehet"
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, "A jelszónak tartalmaznia kell legalább 1 nagybetűt"
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False, "A jelszónak tartalmaznia kell legalább 1 kisbetűt"
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False, "A jelszónak tartalmaznia kell legalább 1 számot"
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;\'`~]', password):
        return False, "A jelszónak tartalmaznia kell legalább 1 speciális karaktert (!@#$%^&*...)"
    
    # Check for common weak passwords
    weak_passwords = [
        'password', 'password123', '12345678', 'qwerty123', 'admin123',
        'welcome123', 'letmein123', 'Password1!', 'Admin123!', 'Qwerty123!'
    ]
    if password.lower() in [wp.lower() for wp in weak_passwords]:
        return False, "Ez egy túl gyakori jelszó. Válassz egyedibb jelszót!"
    
    return True, ""


# ==================== LOGIN ATTEMPT TRACKING ====================

class LoginAttemptTracker:
    """Track failed login attempts and implement account lockout"""
    
    def __init__(self, db: AsyncIOMotorDatabase, max_attempts: int = 5, lockout_minutes: int = 15):
        self.db = db
        self.max_attempts = max_attempts
        self.lockout_minutes = lockout_minutes
    
    async def record_failed_attempt(self, email: str, ip_address: str = "unknown") -> None:
        """Record a failed login attempt"""
        await self.db.login_attempts.insert_one({
            "email": email,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": False
        })
    
    async def record_successful_attempt(self, email: str, ip_address: str = "unknown") -> None:
        """Record a successful login and clear failed attempts"""
        await self.db.login_attempts.insert_one({
            "email": email,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": True
        })
        # Clear failed attempts for this email
        await self.clear_failed_attempts(email)
    
    async def is_locked_out(self, email: str) -> tuple[bool, Optional[datetime]]:
        """
        Check if account is locked out
        Returns: (is_locked, unlock_time)
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=self.lockout_minutes)
        
        # Count failed attempts in the lockout window
        failed_count = await self.db.login_attempts.count_documents({
            "email": email,
            "success": False,
            "timestamp": {"$gte": cutoff_time.isoformat()}
        })
        
        if failed_count >= self.max_attempts:
            # Find the most recent failed attempt
            last_attempt = await self.db.login_attempts.find_one(
                {"email": email, "success": False},
                sort=[("timestamp", -1)]
            )
            if last_attempt:
                last_time = datetime.fromisoformat(last_attempt["timestamp"])
                unlock_time = last_time + timedelta(minutes=self.lockout_minutes)
                return True, unlock_time
        
        return False, None
    
    async def get_remaining_attempts(self, email: str) -> int:
        """Get number of remaining login attempts"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=self.lockout_minutes)
        
        failed_count = await self.db.login_attempts.count_documents({
            "email": email,
            "success": False,
            "timestamp": {"$gte": cutoff_time.isoformat()}
        })
        
        return max(0, self.max_attempts - failed_count)
    
    async def clear_failed_attempts(self, email: str) -> None:
        """Clear all failed attempts for an email"""
        await self.db.login_attempts.delete_many({
            "email": email,
            "success": False
        })


# ==================== AUDIT LOGGING ====================

class AuditLogger:
    """Log important actions for audit trail"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def log(
        self,
        user_id: str,
        user_email: str,
        action: str,
        resource_type: str,
        resource_id: str = "",
        details: dict = None,
        ip_address: str = "unknown"
    ) -> None:
        """
        Log an action to the audit trail
        
        Args:
            user_id: ID of the user performing the action
            user_email: Email of the user
            action: Action performed (created, updated, deleted, viewed, etc.)
            resource_type: Type of resource (worker, project, user, etc.)
            resource_id: ID of the resource
            details: Additional details about the action
            ip_address: IP address of the request
        """
        audit_entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.audit_logs.insert_one(audit_entry)
    
    async def get_logs(
        self,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 100
    ) -> list:
        """Retrieve audit logs with optional filters"""
        query = {}
        if user_id:
            query["user_id"] = user_id
        if resource_type:
            query["resource_type"] = resource_type
        
        logs = await self.db.audit_logs.find(
            query, 
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return logs
    
    async def get_recent_activity(self, user_id: str, days: int = 7) -> list:
        """Get recent activity for a user"""
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        logs = await self.db.audit_logs.find(
            {
                "user_id": user_id,
                "timestamp": {"$gte": cutoff.isoformat()}
            },
            {"_id": 0}
        ).sort("timestamp", -1).limit(50).to_list(50)
        
        return logs


# ==================== INPUT SANITIZATION ====================

def sanitize_string(input_str: str, max_length: int = 1000) -> str:
    """
    Sanitize string input to prevent injection attacks
    """
    if not input_str:
        return ""
    
    # Trim to max length
    sanitized = input_str[:max_length]
    
    # Remove null bytes
    sanitized = sanitized.replace('\x00', '')
    
    # Normalize whitespace
    sanitized = ' '.join(sanitized.split())
    
    return sanitized.strip()


def sanitize_phone(phone: str) -> str:
    """Sanitize phone number - keep only digits, +, -, (, ), and spaces"""
    if not phone:
        return ""
    return re.sub(r'[^\d\+\-\(\)\s]', '', phone).strip()


def sanitize_email(email: str) -> str:
    """Sanitize email address"""
    if not email:
        return ""
    return email.lower().strip()


# ==================== JWT SECRET VALIDATION ====================

def validate_jwt_secret(secret: str) -> bool:
    """
    Validate that JWT secret is strong enough
    """
    if not secret:
        return False
    
    # Must be at least 32 characters
    if len(secret) < 32:
        return False
    
    # Should not be a default/common value
    weak_secrets = [
        'your-secret-key',
        'change-this-secret',
        'dolgozocrm-secret-key',
        'secret',
        'mysecret'
    ]
    
    for weak in weak_secrets:
        if weak in secret.lower():
            return False
    
    return True


# Import for use in security checks
import uuid
from datetime import timedelta
