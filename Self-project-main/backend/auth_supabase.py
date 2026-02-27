import jwt
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Legacy JWT config (for backward compatibility during migration)
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

security = HTTPBearer()


def verify_supabase_token(token: str) -> dict:
    """Verify Supabase JWT token and return user info"""
    try:
        # Create Supabase client to verify token
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Get user from token
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        user_id = str(user_response.user.id)
        
        # Get user role from our users table
        result = supabase.table("users").select("role").eq("id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found"
            )
        
        return {
            "user_id": user_id,
            "role": result.data["role"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user from Supabase token"""
    token = credentials.credentials
    return verify_supabase_token(token)


def get_current_user_from_supabase(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Alias for get_current_user for explicit Supabase usage"""
    return get_current_user(credentials)
