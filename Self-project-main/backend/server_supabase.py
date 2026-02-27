from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, date, timezone
from dateutil.relativedelta import relativedelta
from typing import Optional
from supabase import create_client, Client
from pydantic import BaseModel
import os
import logging

from models import (
    UserCreate, UserLogin, Token, UserResponse, UserProfile, UserRole, ClientType,
    ServiceCreate, ServiceUpdate, ServiceResponse, ServiceFilters,
    ReviewCreate, ReviewResponse, ServiceType, ServiceStatus, VerificationStatus,
    ContractCreate, ContractUpdate, ContractResponse, ContractStatus,
    PaymentCreate, PaymentResponse, PaymentStatus,
    ConversationCreate, MessageCreate, MessageResponse, ConversationResponse
)

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth_supabase import get_current_user, get_current_user_from_supabase
from contracts import (
    generate_contract_terms,
    generate_payment_schedule,
    generate_transaction_id,
    calculate_revenue_split
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


# Supabase connection
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']  # Use service key for backend operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create the main app
app = FastAPI(title="Muyassir API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Helper functions
def serialize_user(user_row: dict) -> dict:
    """Convert Supabase user row to response format"""
    role = user_row.get("role", "client")
    if role == "student":
        role = "client"
    
    # Build profile from flat columns
    profile = {
        "full_name": user_row.get("full_name", ""),
        "phone_masked": user_row.get("phone_masked"),
        "university": user_row.get("university"),
        "student_id": user_row.get("student_id"),
        "profile_picture": user_row.get("profile_picture"),
        "client_type": user_row.get("client_type"),
        "verification_status": user_row.get("verification_status", "unverified"),
        "verification_documents": user_row.get("verification_documents", []),
        "verification_rejected_reason": user_row.get("verification_rejected_reason"),
        "created_at": user_row.get("created_at"),
        "last_login": user_row.get("last_login")
    }
    
    return {
        "id": str(user_row["id"]),
        "email": user_row["email"],
        "role": role,
        "profile": profile,
        "safety_score": float(user_row.get("safety_score", 100.0)),
        "is_active": user_row.get("is_active", True)
    }


async def require_verified_user(user_id: str, action: str = "this action"):
    """Check if user is verified. Raises HTTPException if not."""
    result = supabase.table("users").select("*").eq("id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data
    verification_status = user.get("verification_status", "unverified")
    
    if verification_status != VerificationStatus.VERIFIED:
        status_messages = {
            "unverified": "Please upload your verification documents to complete this action.",
            "pending": "Your verification is pending review. You cannot perform this action until verified.",
            "rejected": f"Your verification was rejected. Please re-submit documents. Reason: {user.get('verification_rejected_reason', 'Not specified')}"
        }
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Verification required: {status_messages.get(verification_status, 'Account not verified')}"
        )


def serialize_service(service_row: dict, provider_row: dict) -> dict:
    """Convert Supabase service row to response format"""
    location = service_row.get("location", {})
    if isinstance(location, str):
        import json
        location = json.loads(location)
    
    return {
        "id": str(service_row["id"]),
        "provider_id": str(service_row["provider_id"]),
        "provider_name": provider_row.get("full_name", "Unknown"),
        "service_type": service_row["service_type"],
        "title": service_row["title"],
        "description": service_row["description"],
        "category": service_row.get("category", "general"),
        "images": service_row.get("images", []),
        "price_monthly": float(service_row["price_monthly"]),
        "capacity": service_row["capacity"],
        "available_slots": service_row.get("available_slots", service_row["capacity"]),
        "location": location,
        "transportation": service_row.get("transportation"),
        "residence": service_row.get("residence"),
        "rating": {
            "average": float(service_row.get("rating_average", 0.0)),
            "count": service_row.get("rating_count", 0)
        },
        "safety_score": float(service_row.get("safety_score", 100.0)),
        "status": service_row.get("status", "active"),
        "auto_accept": service_row.get("auto_accept", False),
        "created_at": service_row.get("created_at"),
        "updated_at": service_row.get("updated_at")
    }


def serialize_review(review_row: dict, student_row: dict) -> dict:
    """Convert Supabase review row to response format"""
    return {
        "id": str(review_row["id"]),
        "service_id": str(review_row["service_id"]),
        "student_id": str(review_row["student_id"]),
        "student_name": student_row.get("full_name", "Anonymous"),
        "rating": review_row["rating"],
        "review_text": review_row["review_text"],
        "safety_rating": review_row["safety_rating"],
        "categories": review_row.get("categories"),
        "verified_booking": review_row.get("verified_booking", False),
        "created_at": review_row.get("created_at"),
        "provider_response": review_row.get("provider_response"),
        "provider_response_at": review_row.get("provider_response_at")
    }


# Authentication Endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user using Supabase Auth"""
    
    # Validate client_type for CLIENT role
    if user_data.role == UserRole.CLIENT:
        if not user_data.client_type or user_data.client_type not in ["student", "employee"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="client_type is required for clients (must be 'student' or 'employee')"
            )
    
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered or invalid"
            )
        
        auth_user_id = auth_response.user.id
        
        # Determine initial verification status
        verification_status = VerificationStatus.UNVERIFIED
        if user_data.verification_document:
            verification_status = VerificationStatus.PENDING
        
        # Create user profile in public.users table
        user_doc = {
            "id": auth_user_id,
            "email": user_data.email,
            "role": user_data.role.value,
            "full_name": user_data.full_name,
            "university": user_data.university,
            "student_id": user_data.student_id,
            "client_type": user_data.client_type if user_data.role == UserRole.CLIENT else None,
            "verification_status": verification_status.value,
            "safety_score": 100.0,
            "is_active": True,
            "is_banned": False,
            "last_login": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table("users").insert(user_doc).execute()
        
        if not result.data:
            # Rollback: delete auth user if profile creation fails
            supabase.auth.admin.delete_user(auth_user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
        
        created_user = result.data[0]
        
        # Handle verification document if provided
        if user_data.verification_document:
            doc_data = {
                "user_id": auth_user_id,
                "file_data": user_data.verification_document if isinstance(user_data.verification_document, str) else user_data.verification_document.get("file_data", ""),
                "file_name": user_data.verification_document.get("file_name") if isinstance(user_data.verification_document, dict) else None,
                "file_type": user_data.verification_document.get("file_type") if isinstance(user_data.verification_document, dict) else None,
            }
            supabase.table("verification_documents").insert(doc_data).execute()
        
        # Get access token from the sign up response
        access_token = auth_response.session.access_token if auth_response.session else None
        
        if not access_token:
            # If no session (email confirmation required), sign in to get token
            login_response = supabase.auth.sign_in_with_password({
                "email": user_data.email,
                "password": user_data.password
            })
            access_token = login_response.session.access_token
        
        # Fetch verification documents for response
        docs_result = supabase.table("verification_documents").select("*").eq("user_id", auth_user_id).execute()
        created_user["verification_documents"] = [
            {
                "file_name": d.get("file_name"),
                "file_type": d.get("file_type"),
                "file_data": d.get("file_data"),
                "uploaded_at": d.get("uploaded_at")
            }
            for d in (docs_result.data or [])
        ]
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": serialize_user(created_user)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        if "already registered" in str(e).lower() or "already exists" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user using Supabase Auth"""
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user_id = auth_response.user.id
        
        # Get user profile
        result = supabase.table("users").select("*").eq("id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found"
            )
        
        user = result.data
        
        # Check if user is banned
        if user.get("is_banned", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended"
            )
        
        # Update last login
        supabase.table("users").update({
            "last_login": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_id).execute()
        
        # Fetch verification documents
        docs_result = supabase.table("verification_documents").select("*").eq("user_id", user_id).execute()
        user["verification_documents"] = [
            {
                "file_name": d.get("file_name"),
                "file_type": d.get("file_type"),
                "file_data": d.get("file_data"),
                "uploaded_at": d.get("uploaded_at")
            }
            for d in (docs_result.data or [])
        ]
        
        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "user": serialize_user(user)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    result = supabase.table("users").select("*").eq("id", current_user["user_id"]).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = result.data
    
    # Fetch verification documents
    docs_result = supabase.table("verification_documents").select("*").eq("user_id", current_user["user_id"]).execute()
    user["verification_documents"] = [
        {
            "file_name": d.get("file_name"),
            "file_type": d.get("file_type"),
            "file_data": d.get("file_data"),
            "uploaded_at": d.get("uploaded_at")
        }
        for d in (docs_result.data or [])
    ]
    
    return serialize_user(user)


# ============================================================
# VERIFICATION ENDPOINTS
# ============================================================

class DocumentUpload(BaseModel):
    document: str  # Base64 encoded document

@api_router.post("/auth/upload-verification-document")
async def upload_verification_document(
    doc_data: DocumentUpload,
    current_user: dict = Depends(get_current_user)
):
    """Upload verification document"""
    user_id = current_user["user_id"]
    
    result = supabase.table("users").select("verification_status").eq("id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_status = result.data.get("verification_status", "unverified")
    if current_status == VerificationStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Account is already verified")
    
    # Add document
    doc_insert = {
        "user_id": user_id,
        "file_data": doc_data.document if isinstance(doc_data.document, str) else doc_data.document.get("file_data", ""),
        "file_name": doc_data.document.get("file_name") if isinstance(doc_data.document, dict) else None,
        "file_type": doc_data.document.get("file_type") if isinstance(doc_data.document, dict) else None,
    }
    supabase.table("verification_documents").insert(doc_insert).execute()
    
    # Update user status to pending
    supabase.table("users").update({
        "verification_status": VerificationStatus.PENDING.value,
        "verification_rejected_reason": None
    }).eq("id", user_id).execute()
    
    return {
        "message": "Document uploaded successfully. Your account is pending verification.",
        "verification_status": VerificationStatus.PENDING.value
    }


class VerificationDecision(BaseModel):
    user_id: str
    decision: str  # "verified" or "rejected"
    rejection_reason: Optional[str] = None

@api_router.post("/admin/verify-user")
async def admin_verify_user(
    decision_data: VerificationDecision,
    current_user: dict = Depends(get_current_user)
):
    """Admin endpoint to verify or reject a user"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = supabase.table("users").select("*").eq("id", decision_data.user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if decision_data.decision not in ["verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'verified' or 'rejected'")
    
    update_data = {"verification_status": decision_data.decision}
    if decision_data.decision == "rejected":
        if not decision_data.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        update_data["verification_rejected_reason"] = decision_data.rejection_reason
    else:
        update_data["verification_rejected_reason"] = None
    
    supabase.table("users").update(update_data).eq("id", decision_data.user_id).execute()
    
    updated_result = supabase.table("users").select("*").eq("id", decision_data.user_id).single().execute()
    updated_user = updated_result.data
    
    # Fetch verification documents
    docs_result = supabase.table("verification_documents").select("*").eq("user_id", decision_data.user_id).execute()
    updated_user["verification_documents"] = docs_result.data or []
    
    return {
        "message": f"User {decision_data.decision}",
        "user": serialize_user(updated_user)
    }


@api_router.get("/admin/pending-verifications")
async def get_pending_verifications(current_user: dict = Depends(get_current_user)):
    """Get all users with pending verification"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = supabase.table("users").select("*").eq("verification_status", "pending").execute()
    
    users = result.data or []
    results = []
    
    for user in users:
        # Fetch verification documents
        docs_result = supabase.table("verification_documents").select("*").eq("user_id", user["id"]).execute()
        docs = docs_result.data or []
        
        normalized_docs = []
        for d in docs:
            file_type = d.get("file_type") or "application/octet-stream"
            data_uri = f"data:{file_type};base64,{d.get('file_data', '')}"
            normalized_docs.append({
                "file_name": d.get("file_name"),
                "file_type": d.get("file_type"),
                "file_data": d.get("file_data"),
                "uploaded_at": d.get("uploaded_at"),
                "data_uri": data_uri
            })
        
        user["verification_documents"] = normalized_docs
        serialized = serialize_user(user)
        serialized["profile"]["verification_documents"] = normalized_docs
        results.append(serialized)
    
    return results


@api_router.get("/admin/users")
async def admin_list_users(current_user: dict = Depends(get_current_user)):
    """List all users (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = supabase.table("users").select("*").execute()
    users = result.data or []
    
    return [serialize_user(user) for user in users]


@api_router.get("/admin/services")
async def admin_list_services(current_user: dict = Depends(get_current_user)):
    """List all services (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = supabase.table("services").select("*").execute()
    services = result.data or []
    
    results = []
    for s in services:
        provider_result = supabase.table("users").select("full_name").eq("id", s["provider_id"]).single().execute()
        provider = provider_result.data or {"full_name": "Unknown"}
        results.append(serialize_service(s, provider))
    
    return results


@api_router.put("/admin/services/{service_id}/suspend")
async def admin_suspend_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Suspend a service (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    supabase.table("services").update({"status": "suspended"}).eq("id", service_id).execute()
    return {"message": "Service suspended"}


@api_router.put("/admin/services/{service_id}/unsuspend")
async def admin_unsuspend_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Unsuspend a service (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    supabase.table("services").update({"status": "active"}).eq("id", service_id).execute()
    return {"message": "Service unsuspended"}


@api_router.get("/admin/contracts")
async def admin_list_contracts(current_user: dict = Depends(get_current_user)):
    """List all contracts (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = supabase.table("contracts").select("*").order("created_at", desc=True).execute()
    contracts = result.data or []
    
    results = []
    for c in contracts:
        student_result = supabase.table("users").select("full_name").eq("id", c["student_id"]).single().execute()
        provider_result = supabase.table("users").select("full_name").eq("id", c["provider_id"]).single().execute()
        service_result = supabase.table("services").select("title").eq("id", c["service_id"]).single().execute()
        
        results.append({
            "id": str(c["id"]),
            "student_id": str(c["student_id"]),
            "student_name": student_result.data["full_name"] if student_result.data else "Unknown",
            "provider_id": str(c["provider_id"]),
            "provider_name": provider_result.data["full_name"] if provider_result.data else "Unknown",
            "service_id": str(c["service_id"]),
            "service_title": service_result.data["title"] if service_result.data else "Unknown",
            "status": c["status"],
            "total_amount": float(c.get("total_amount", 0)),
            "created_at": c.get("created_at")
        })
    
    return results


# Service Endpoints (Clients)
@api_router.get("/services", response_model=list[ServiceResponse])
async def list_services(
    service_type: Optional[ServiceType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    city: Optional[str] = None,
    university: Optional[str] = None,
    min_rating: Optional[float] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """List services with optional filters"""
    query = supabase.table("services").select("*").eq("status", "active")
    
    if service_type:
        query = query.eq("service_type", service_type.value)
    if min_price is not None:
        query = query.gte("price_monthly", min_price)
    if max_price is not None:
        query = query.lte("price_monthly", max_price)
    if min_rating is not None:
        query = query.gte("rating_average", min_rating)
    
    query = query.order("created_at", desc=True).range(skip, skip + limit - 1)
    result = query.execute()
    
    services = result.data or []
    
    # Filter by city/university (JSONB queries)
    if city or university:
        filtered_services = []
        for s in services:
            location = s.get("location", {})
            if isinstance(location, str):
                import json
                location = json.loads(location)
            
            if city and city.lower() not in location.get("city", "").lower():
                continue
            if university and university.lower() not in location.get("university_nearby", "").lower():
                continue
            filtered_services.append(s)
        services = filtered_services
    
    # Get provider info for each service
    results = []
    for service in services:
        provider_result = supabase.table("users").select("full_name").eq("id", service["provider_id"]).single().execute()
        if provider_result.data:
            results.append(serialize_service(service, provider_result.data))
    
    return results


@api_router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str):
    """Get service details"""
    result = supabase.table("services").select("*").eq("id", service_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service = result.data
    provider_result = supabase.table("users").select("full_name").eq("id", service["provider_id"]).single().execute()
    
    if not provider_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return serialize_service(service, provider_result.data)


@api_router.post("/services/search", response_model=list[ServiceResponse])
async def search_services(filters: ServiceFilters):
    """Advanced service search"""
    query = supabase.table("services").select("*").eq("status", "active")
    
    if filters.service_type:
        query = query.eq("service_type", filters.service_type.value)
    if filters.min_price is not None:
        query = query.gte("price_monthly", filters.min_price)
    if filters.max_price is not None:
        query = query.lte("price_monthly", filters.max_price)
    if filters.min_rating is not None:
        query = query.gte("rating_average", filters.min_rating)
    
    query = query.order("created_at", desc=True).range(filters.skip, filters.skip + filters.limit - 1)
    result = query.execute()
    
    services = result.data or []
    
    # Filter by city/university/gender/amenities
    filtered_services = []
    for s in services:
        location = s.get("location", {})
        if isinstance(location, str):
            import json
            location = json.loads(location)
        
        if filters.city and filters.city.lower() not in location.get("city", "").lower():
            continue
        if filters.university and filters.university.lower() not in location.get("university_nearby", "").lower():
            continue
        
        if filters.gender_restriction:
            residence = s.get("residence", {})
            if residence and residence.get("gender_restriction") != filters.gender_restriction.value:
                continue
        
        if filters.amenities:
            transport_amenities = (s.get("transportation") or {}).get("amenities", [])
            residence_amenities = (s.get("residence") or {}).get("amenities", [])
            all_amenities = transport_amenities + residence_amenities
            if not any(a in all_amenities for a in filters.amenities):
                continue
        
        filtered_services.append(s)
    
    # Get provider info
    results = []
    for service in filtered_services:
        provider_result = supabase.table("users").select("full_name").eq("id", service["provider_id"]).single().execute()
        if provider_result.data:
            results.append(serialize_service(service, provider_result.data))
    
    return results


# Service Endpoints (Providers)
@api_router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new service listing (provider must be verified)"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service providers can create services"
        )
    
    await require_verified_user(current_user["user_id"], "publish services")
    
    # Validate service type specific data
    if service_data.service_type == ServiceType.TRANSPORTATION and not service_data.transportation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transportation details are required for transportation services"
        )
    if service_data.service_type == ServiceType.RESIDENCE and not service_data.residence:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Residence details are required for residence services"
        )
    
    # Create service document
    service_doc = {
        "provider_id": current_user["user_id"],
        "service_type": service_data.service_type.value,
        "title": service_data.title,
        "description": service_data.description,
        "category": service_data.category,
        "images": service_data.images,
        "price_monthly": float(service_data.price_monthly),
        "capacity": service_data.capacity,
        "available_slots": service_data.capacity,
        "location": service_data.location.model_dump(),
        "rating_average": 0.0,
        "rating_count": 0,
        "safety_score": 100.0,
        "status": ServiceStatus.ACTIVE.value,
        "auto_accept": service_data.auto_accept,
    }
    
    if service_data.transportation:
        service_doc["transportation"] = service_data.transportation.model_dump()
    if service_data.residence:
        service_doc["residence"] = service_data.residence.model_dump()
    
    result = supabase.table("services").insert(service_doc).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create service"
        )
    
    created_service = result.data[0]
    provider_result = supabase.table("users").select("full_name").eq("id", current_user["user_id"]).single().execute()
    
    return serialize_service(created_service, provider_result.data or {"full_name": "Unknown"})


@api_router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service_data: ServiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update service listing"""
    result = supabase.table("services").select("*").eq("id", service_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service = result.data
    
    if str(service["provider_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own services"
        )
    
    # Build update document
    update_data = service_data.model_dump(exclude_unset=True)
    update_doc = {}
    
    for key, value in update_data.items():
        if value is not None:
            if key in ["location", "transportation", "residence"] and value:
                update_doc[key] = value if isinstance(value, dict) else value
            elif key == "service_type":
                update_doc[key] = value.value if hasattr(value, 'value') else value
            elif key == "status":
                update_doc[key] = value.value if hasattr(value, 'value') else value
            else:
                update_doc[key] = value
    
    if update_doc:
        supabase.table("services").update(update_doc).eq("id", service_id).execute()
    
    updated_result = supabase.table("services").select("*").eq("id", service_id).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", service["provider_id"]).single().execute()
    
    return serialize_service(updated_result.data, provider_result.data or {"full_name": "Unknown"})


@api_router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete service listing"""
    result = supabase.table("services").select("*").eq("id", service_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service = result.data
    
    if str(service["provider_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own services"
        )
    
    # Soft delete by setting status to inactive
    supabase.table("services").update({"status": ServiceStatus.INACTIVE.value}).eq("id", service_id).execute()
    
    return None


@api_router.get("/services/provider/my-listings", response_model=list[ServiceResponse])
async def get_my_listings(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get provider's service listings"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service providers can access listings"
        )
    
    result = supabase.table("services").select("*").eq("provider_id", current_user["user_id"]).order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    
    services = result.data or []
    provider_result = supabase.table("users").select("full_name").eq("id", current_user["user_id"]).single().execute()
    provider = provider_result.data or {"full_name": "Unknown"}
    
    return [serialize_service(service, provider) for service in services]


# Review Endpoints
@api_router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a service"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create reviews"
        )
    
    # Check if service exists
    service_result = supabase.table("services").select("*").eq("id", review_data.service_id).single().execute()
    
    if not service_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check if user already reviewed
    existing_result = supabase.table("reviews").select("id").eq("service_id", review_data.service_id).eq("student_id", current_user["user_id"]).execute()
    
    if existing_result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this service"
        )
    
    # Create review
    review_doc = {
        "service_id": review_data.service_id,
        "student_id": current_user["user_id"],
        "rating": review_data.rating,
        "review_text": review_data.review_text,
        "safety_rating": review_data.safety_rating,
        "categories": review_data.categories.model_dump() if review_data.categories else None,
        "verified_booking": False,
    }
    
    result = supabase.table("reviews").insert(review_doc).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create review"
        )
    
    created_review = result.data[0]
    
    # Update service rating
    all_reviews_result = supabase.table("reviews").select("rating").eq("service_id", review_data.service_id).execute()
    all_reviews = all_reviews_result.data or []
    
    if all_reviews:
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        supabase.table("services").update({
            "rating_average": round(avg_rating, 2),
            "rating_count": len(all_reviews)
        }).eq("id", review_data.service_id).execute()
    
    # Get student info
    student_result = supabase.table("users").select("full_name").eq("id", current_user["user_id"]).single().execute()
    
    return serialize_review(created_review, student_result.data or {"full_name": "Anonymous"})


@api_router.get("/reviews/service/{service_id}", response_model=list[ReviewResponse])
async def get_service_reviews(
    service_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get reviews for a service"""
    service_result = supabase.table("services").select("id").eq("id", service_id).single().execute()
    
    if not service_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    result = supabase.table("reviews").select("*").eq("service_id", service_id).order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    
    reviews = result.data or []
    results = []
    
    for review in reviews:
        student_result = supabase.table("users").select("full_name").eq("id", review["student_id"]).single().execute()
        if student_result.data:
            results.append(serialize_review(review, student_result.data))
    
    return results


# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Muyassir API", "database": "Supabase PostgreSQL"}


# ============================================================
# CONTRACT ENDPOINTS - Phase 2
# ============================================================

def serialize_contract(contract: dict, student: dict, provider: dict, service: dict) -> dict:
    """Helper to serialize contract response with signatures and payments"""
    contract_id = contract["id"]
    
    # Fetch signatures
    sig_result = supabase.table("contract_signatures").select("*").eq("contract_id", contract_id).execute()
    signatures = sig_result.data or []
    
    student_signature = {"signed": False, "signed_at": None, "ip_address": None}
    provider_signature = {"signed": False, "signed_at": None, "ip_address": None}
    
    for sig in signatures:
        if sig["signature_type"] == "student":
            student_signature = {
                "signed": sig["signed"],
                "signed_at": sig["signed_at"],
                "ip_address": sig["ip_address"]
            }
        elif sig["signature_type"] == "provider":
            provider_signature = {
                "signed": sig["signed"],
                "signed_at": sig["signed_at"],
                "ip_address": sig["ip_address"]
            }
    
    # Fetch payment schedule
    pay_result = supabase.table("contract_payments").select("*").eq("contract_id", contract_id).order("payment_order").execute()
    payment_schedule = [
        {
            "due_date": p["due_date"],
            "amount": float(p["amount"]),
            "status": p["status"],
            "paid_at": p["paid_at"],
            "transaction_id": p["transaction_id"]
        }
        for p in (pay_result.data or [])
    ]
    
    return {
        "id": str(contract["id"]),
        "student_id": str(contract["student_id"]),
        "student_name": student.get("full_name", "Unknown"),
        "provider_id": str(contract["provider_id"]),
        "provider_name": provider.get("full_name", "Unknown"),
        "service_id": str(contract["service_id"]),
        "service_title": service.get("title", "Unknown"),
        "start_date": contract["start_date"],
        "end_date": contract["end_date"],
        "monthly_price": float(contract["monthly_price"]),
        "duration_months": contract["duration_months"],
        "total_amount": float(contract["total_amount"]),
        "auto_generated_terms": contract["auto_generated_terms"],
        "student_signature": student_signature,
        "provider_signature": provider_signature,
        "payment_schedule": payment_schedule,
        "status": contract["status"],
        "created_at": contract["created_at"],
        "updated_at": contract["updated_at"]
    }


@api_router.post("/contracts", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_data: ContractCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new contract (client only, must be verified)"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create contracts"
        )
    
    await require_verified_user(current_user["user_id"], "create contracts")
    
    # Get service
    service_result = supabase.table("services").select("*").eq("id", contract_data.service_id).single().execute()
    
    if not service_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service = service_result.data
    
    # Check availability
    available_slots = service.get("available_slots", service.get("capacity", 0))
    if available_slots <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available slots for this service."
        )
    
    # Get provider and student info
    provider_result = supabase.table("users").select("*").eq("id", service["provider_id"]).single().execute()
    student_result = supabase.table("users").select("*").eq("id", current_user["user_id"]).single().execute()
    
    provider = provider_result.data
    student = student_result.data
    
    # Check provider verification
    if provider.get("verification_status") != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This service provider is not yet verified."
        )
    
    # Calculate dates
    start_date = contract_data.start_date
    end_date = start_date + relativedelta(months=contract_data.duration_months)
    monthly_price = float(service["price_monthly"])
    total_amount = monthly_price * contract_data.duration_months
    
    # Generate contract terms
    service_for_terms = {
        **service,
        "provider_id": service["provider_id"]
    }
    provider_for_terms = {"profile": {"full_name": provider["full_name"]}, "safety_score": provider.get("safety_score", 100)}
    student_for_terms = {"profile": {"full_name": student["full_name"], "university": student.get("university"), "student_id": student.get("student_id")}}
    
    terms = generate_contract_terms(
        service=service_for_terms,
        provider=provider_for_terms,
        student=student_for_terms,
        duration_months=contract_data.duration_months,
        start_date=start_date
    )
    
    # Determine initial status
    auto_accept = service.get("auto_accept", False)
    initial_status = ContractStatus.AWAITING_STUDENT_CONFIRMATION.value if auto_accept else ContractStatus.PENDING_PROVIDER_APPROVAL.value
    
    # Create contract
    contract_doc = {
        "student_id": current_user["user_id"],
        "provider_id": service["provider_id"],
        "service_id": contract_data.service_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "monthly_price": monthly_price,
        "duration_months": contract_data.duration_months,
        "total_amount": total_amount,
        "auto_generated_terms": terms,
        "status": initial_status,
    }
    
    result = supabase.table("contracts").insert(contract_doc).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create contract"
        )
    
    created_contract = result.data[0]
    contract_id = created_contract["id"]
    
    # Create signatures
    student_sig = {"contract_id": contract_id, "signature_type": "student", "signed": False}
    provider_sig = {
        "contract_id": contract_id,
        "signature_type": "provider",
        "signed": auto_accept,
        "signed_at": datetime.now(timezone.utc).isoformat() if auto_accept else None,
        "ip_address": "auto-accept" if auto_accept else None
    }
    
    supabase.table("contract_signatures").insert([student_sig, provider_sig]).execute()
    
    # Create payment schedule
    payment_schedule = generate_payment_schedule(start_date, contract_data.duration_months, monthly_price)
    for i, payment in enumerate(payment_schedule):
        pay_doc = {
            "contract_id": contract_id,
            "due_date": payment["due_date"].isoformat() if hasattr(payment["due_date"], 'isoformat') else payment["due_date"],
            "amount": float(payment["amount"]),
            "status": payment["status"],
            "payment_order": i
        }
        supabase.table("contract_payments").insert(pay_doc).execute()
    
    return serialize_contract(created_contract, student, provider, service)


@api_router.get("/contracts/student/my-contracts", response_model=list[ContractResponse])
async def get_student_contracts(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get student's contracts"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint"
        )
    
    result = supabase.table("contracts").select("*").eq("student_id", current_user["user_id"]).order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    
    contracts = result.data or []
    results = []
    
    for contract in contracts:
        student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
        provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
        service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
        
        results.append(serialize_contract(
            contract,
            student_result.data or {},
            provider_result.data or {},
            service_result.data or {}
        ))
    
    return results


@api_router.get("/contracts/provider/my-contracts", response_model=list[ContractResponse])
async def get_provider_contracts(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get provider's contracts"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only providers can access this endpoint"
        )
    
    result = supabase.table("contracts").select("*").eq("provider_id", current_user["user_id"]).order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    
    contracts = result.data or []
    results = []
    
    for contract in contracts:
        student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
        provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
        service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
        
        results.append(serialize_contract(
            contract,
            student_result.data or {},
            provider_result.data or {},
            service_result.data or {}
        ))
    
    return results


@api_router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get contract details"""
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    contract = result.data
    
    # Check access
    if contract["student_id"] != current_user["user_id"] and contract["provider_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this contract"
        )
    
    student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
    service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
    
    return serialize_contract(
        contract,
        student_result.data or {},
        provider_result.data or {},
        service_result.data or {}
    )


@api_router.post("/contracts/{contract_id}/provider-accept", response_model=ContractResponse)
async def provider_accept_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Provider accepts a contract request"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(status_code=403, detail="Only providers can accept contracts")
    
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract = result.data
    
    if contract["provider_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.PENDING_PROVIDER_APPROVAL.value:
        raise HTTPException(status_code=400, detail=f"Contract is not pending approval (status: {contract['status']})")
    
    # Update contract status
    supabase.table("contracts").update({
        "status": ContractStatus.AWAITING_STUDENT_CONFIRMATION.value
    }).eq("id", contract_id).execute()
    
    # Update provider signature
    supabase.table("contract_signatures").update({
        "signed": True,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": "0.0.0.0"
    }).eq("contract_id", contract_id).eq("signature_type", "provider").execute()
    
    # Fetch updated data
    updated_result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
    service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
    
    return serialize_contract(
        updated_result.data,
        student_result.data or {},
        provider_result.data or {},
        service_result.data or {}
    )


@api_router.post("/contracts/{contract_id}/provider-reject", response_model=ContractResponse)
async def provider_reject_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Provider rejects a contract request"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(status_code=403, detail="Only providers can reject contracts")
    
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract = result.data
    
    if contract["provider_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.PENDING_PROVIDER_APPROVAL.value:
        raise HTTPException(status_code=400, detail="Contract is not pending approval")
    
    supabase.table("contracts").update({
        "status": ContractStatus.REJECTED.value
    }).eq("id", contract_id).execute()
    
    updated_result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
    service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
    
    return serialize_contract(
        updated_result.data,
        student_result.data or {},
        provider_result.data or {},
        service_result.data or {}
    )


@api_router.post("/contracts/{contract_id}/student-confirm", response_model=ContractResponse)
async def student_confirm_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Student confirms and activates contract"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only students can confirm contracts")
    
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract = result.data
    
    if contract["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.AWAITING_STUDENT_CONFIRMATION.value:
        raise HTTPException(status_code=400, detail="Contract is not awaiting your confirmation")
    
    # Update contract status
    supabase.table("contracts").update({
        "status": ContractStatus.ACTIVE.value
    }).eq("id", contract_id).execute()
    
    # Update student signature
    supabase.table("contract_signatures").update({
        "signed": True,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": "0.0.0.0"
    }).eq("contract_id", contract_id).eq("signature_type", "student").execute()
    
    # Reserve capacity
    service_result = supabase.table("services").select("available_slots").eq("id", contract["service_id"]).single().execute()
    if service_result.data:
        new_slots = max(0, service_result.data["available_slots"] - 1)
        supabase.table("services").update({"available_slots": new_slots}).eq("id", contract["service_id"]).execute()
    
    updated_result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
    service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
    
    return serialize_contract(
        updated_result.data,
        student_result.data or {},
        provider_result.data or {},
        service_result.data or {}
    )


@api_router.post("/contracts/{contract_id}/sign", response_model=ContractResponse)
async def sign_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Legacy sign endpoint - redirects to appropriate action"""
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    contract = result.data
    user_id = current_user["user_id"]
    
    if contract["provider_id"] == user_id:
        if contract["status"] == ContractStatus.PENDING_PROVIDER_APPROVAL.value:
            return await provider_accept_contract(contract_id, current_user)
        else:
            raise HTTPException(status_code=400, detail="No action needed from provider")
    elif contract["student_id"] == user_id:
        if contract["status"] == ContractStatus.AWAITING_STUDENT_CONFIRMATION.value:
            return await student_confirm_contract(contract_id, current_user)
        else:
            raise HTTPException(status_code=400, detail="No action needed from student yet")
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to sign this contract"
        )


@api_router.put("/contracts/{contract_id}/cancel", response_model=ContractResponse)
async def cancel_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a contract"""
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    contract = result.data
    user_id = current_user["user_id"]
    
    if contract["student_id"] != user_id and contract["provider_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this contract"
        )
    
    # Update status
    supabase.table("contracts").update({
        "status": ContractStatus.CANCELLED.value
    }).eq("id", contract_id).execute()
    
    # Restore available slots
    service_result = supabase.table("services").select("available_slots").eq("id", contract["service_id"]).single().execute()
    if service_result.data:
        new_slots = service_result.data["available_slots"] + 1
        supabase.table("services").update({"available_slots": new_slots}).eq("id", contract["service_id"]).execute()
    
    updated_result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
    service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
    
    return serialize_contract(
        updated_result.data,
        student_result.data or {},
        provider_result.data or {},
        service_result.data or {}
    )


@api_router.put("/contracts/{contract_id}/complete", response_model=ContractResponse)
async def complete_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an ACTIVE contract as COMPLETED"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can mark contracts as completed"
        )
    
    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract = result.data
    
    if contract["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Only ACTIVE contracts can be marked as completed")
    
    supabase.table("contracts").update({
        "status": ContractStatus.COMPLETED.value
    }).eq("id", contract_id).execute()
    
    updated_result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    student_result = supabase.table("users").select("full_name").eq("id", contract["student_id"]).single().execute()
    provider_result = supabase.table("users").select("full_name").eq("id", contract["provider_id"]).single().execute()
    service_result = supabase.table("services").select("title").eq("id", contract["service_id"]).single().execute()
    
    return serialize_contract(
        updated_result.data,
        student_result.data or {},
        provider_result.data or {},
        service_result.data or {}
    )


# ============================================================
# PAYMENT ENDPOINTS
# ============================================================

@api_router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def make_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Process a payment (student only)"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can make payments"
        )
    
    contract_result = supabase.table("contracts").select("*").eq("id", payment_data.contract_id).single().execute()
    
    if not contract_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    contract = contract_result.data
    
    if str(contract["student_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only pay for your own contracts"
        )
    
    # Calculate revenue split
    split = calculate_revenue_split(payment_data.amount)
    transaction_id = generate_transaction_id()
    
    # Create payment record
    payment_doc = {
        "contract_id": payment_data.contract_id,
        "student_id": contract["student_id"],
        "provider_id": contract["provider_id"],
        "amount": float(payment_data.amount),
        "provider_amount": split["provider_amount"],
        "platform_fee": split["platform_fee"],
        "payment_method": payment_data.payment_method,
        "transaction_id": transaction_id,
        "status": PaymentStatus.PAID.value,
        "paid_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = supabase.table("payments").insert(payment_doc).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment"
        )
    
    created_payment = result.data[0]
    
    # Update payment schedule - mark first pending as paid
    schedule_result = supabase.table("contract_payments").select("*").eq("contract_id", payment_data.contract_id).eq("status", "pending").order("payment_order").limit(1).execute()
    
    if schedule_result.data:
        payment_item = schedule_result.data[0]
        supabase.table("contract_payments").update({
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "transaction_id": transaction_id
        }).eq("id", payment_item["id"]).execute()
    
    return {
        "id": str(created_payment["id"]),
        "contract_id": str(created_payment["contract_id"]),
        "student_id": str(created_payment["student_id"]),
        "provider_id": str(created_payment["provider_id"]),
        "amount": float(created_payment["amount"]),
        "provider_amount": float(created_payment["provider_amount"]),
        "platform_fee": float(created_payment["platform_fee"]),
        "payment_method": created_payment["payment_method"],
        "transaction_id": created_payment["transaction_id"],
        "status": created_payment["status"],
        "paid_at": created_payment["paid_at"],
        "created_at": created_payment["created_at"]
    }


@api_router.get("/payments/contract/{contract_id}", response_model=list[PaymentResponse])
async def get_contract_payments(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all payments for a contract"""
    contract_result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    
    if not contract_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    contract = contract_result.data
    user_id = current_user["user_id"]
    
    if contract["student_id"] != user_id and contract["provider_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this contract's payments"
        )
    
    result = supabase.table("payments").select("*").eq("contract_id", contract_id).order("created_at", desc=True).execute()
    
    payments = result.data or []
    
    return [{
        "id": str(p["id"]),
        "contract_id": str(p["contract_id"]),
        "student_id": str(p["student_id"]),
        "provider_id": str(p["provider_id"]),
        "amount": float(p["amount"]),
        "provider_amount": float(p["provider_amount"]),
        "platform_fee": float(p["platform_fee"]),
        "payment_method": p["payment_method"],
        "transaction_id": p["transaction_id"],
        "status": p["status"],
        "paid_at": p["paid_at"],
        "created_at": p["created_at"]
    } for p in payments]


# Include router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


print("SERVICE KEY START:", SUPABASE_KEY[:20])