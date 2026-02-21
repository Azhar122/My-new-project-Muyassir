from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from bson import ObjectId
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Optional

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
from auth import hash_password, verify_password, create_access_token, get_current_user
from contracts import (
    generate_contract_terms,
    generate_payment_schedule,
    generate_transaction_id,
    calculate_revenue_split
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create indexes
async def create_indexes():
    # Users indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    
    # Services indexes
    await db.services.create_index("provider_id")
    await db.services.create_index("service_type")
    await db.services.create_index("status")
    await db.services.create_index([("location.city", 1), ("service_type", 1)])
    
    # Reviews indexes
    await db.reviews.create_index("service_id")
    await db.reviews.create_index("student_id")

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
def serialize_user(user_doc: dict) -> dict:
    """Convert MongoDB user document to response format"""
    # Handle role migration from 'student' to 'client' for backward compatibility
    role = user_doc["role"]
    if role == "student":
        role = "client"
    
    # Handle profile migration for backward compatibility
    profile = user_doc.get("profile", {})
    # Normalize verification documents
    docs = profile.get("verification_documents", [])
    normalized_docs = []

    for d in docs:
        if isinstance(d, str):
            normalized_docs.append({
                "file_name": None,
                "file_type": None,
                "file_data": d,
                "uploaded_at": None
            })
        else:
            normalized_docs.append(d)

    profile["verification_documents"] = normalized_docs
    
    # Ensure verification_status exists (grandfather existing users as verified)
    if "verification_status" not in profile:
        profile["verification_status"] = "verified"
    
    # Ensure client_type exists for client role users
    if role == "client" and not profile.get("client_type"):
        # Default to "student" for existing clients without client_type
        profile["client_type"] = "student"
    
    return {
        "id": str(user_doc["_id"]),
        "email": user_doc["email"],
        "role": role,
        "profile": profile,
        "safety_score": user_doc.get("safety_score", 100.0),
        "is_active": user_doc.get("is_active", True)
    }

async def require_verified_user(user_id: str, action: str = "this action"):
    """Check if user is verified. Raises HTTPException if not."""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    verification_status = user.get("profile", {}).get("verification_status", "unverified")
    if verification_status != VerificationStatus.VERIFIED:
        status_messages = {
            "unverified": "Please upload your verification documents to complete this action.",
            "pending": "Your verification is pending review. You cannot perform this action until verified.",
            "rejected": f"Your verification was rejected. Please re-submit documents. Reason: {user.get('profile', {}).get('verification_rejected_reason', 'Not specified')}"
        }
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Verification required: {status_messages.get(verification_status, 'Account not verified')}"
        )

def serialize_service(service_doc: dict, provider_doc: dict) -> dict:
    """Convert MongoDB service document to response format"""
    return {
        "id": str(service_doc["_id"]),
        "provider_id": str(service_doc["provider_id"]),
        "provider_name": provider_doc.get("profile", {}).get("full_name", "Unknown"),
        "service_type": service_doc["service_type"],
        "title": service_doc["title"],
        "description": service_doc["description"],
        "images": service_doc.get("images", []),
        "price_monthly": service_doc["price_monthly"],
        "capacity": service_doc["capacity"],
        "available_slots": service_doc.get("available_slots", service_doc["capacity"]),
        "location": service_doc["location"],
        "transportation": service_doc.get("transportation"),
        "residence": service_doc.get("residence"),
        "rating": service_doc.get("rating", {"average": 0.0, "count": 0}),
        "safety_score": service_doc.get("safety_score", 100.0),
        "status": service_doc.get("status", "active"),
        "auto_accept": service_doc.get("auto_accept", False),
        "created_at": service_doc.get("created_at", datetime.utcnow()),
        "updated_at": service_doc.get("updated_at", datetime.utcnow())
    }

def serialize_review(review_doc: dict, student_doc: dict) -> dict:
    """Convert MongoDB review document to response format"""
    return {
        "id": str(review_doc["_id"]),
        "service_id": str(review_doc["service_id"]),
        "student_id": str(review_doc["student_id"]),
        "student_name": student_doc.get("profile", {}).get("full_name", "Anonymous"),
        "rating": review_doc["rating"],
        "review_text": review_doc["review_text"],
        "safety_rating": review_doc["safety_rating"],
        "categories": review_doc.get("categories"),
        "verified_booking": review_doc.get("verified_booking", False),
        "created_at": review_doc.get("created_at", datetime.utcnow()),
        "provider_response": review_doc.get("provider_response"),
        "provider_response_at": review_doc.get("provider_response_at")
    }


# Authentication Endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    print("REGISTER EMAIL:", user_data.email)
    
    existing_user = await db.users.find_one({"email": user_data.email})
    print("USER EXISTS:", existing_user)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate client_type for CLIENT role
    if user_data.role == UserRole.CLIENT:
        if not user_data.client_type or user_data.client_type not in ["student", "employee"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="client_type is required for clients (must be 'student' or 'employee')"
            )
    
    # Determine initial verification status
    # If document provided, set to pending; otherwise unverified
    """verification_docs = []
    if user_data.verification_document:
        verification_docs = [user_data.verification_document]
        verification_status = VerificationStatus.PENDING
    else:
        verification_status = VerificationStatus.UNVERIFIED"""
    
    # Determine initial verification status
    verification_docs = []
    verification_status = VerificationStatus.UNVERIFIED

    if user_data.verification_document:
        verification_status=VerificationStatus.PENDING
    # If frontend sends structured object
        if isinstance(user_data.verification_document, dict):
            verification_docs = [{
                "file_name": user_data.verification_document.get("file_name"),
                "file_type": user_data.verification_document.get("file_type"),
                "file_data": user_data.verification_document.get("file_data"),
                "uploaded_at": datetime.utcnow(),
            }]
        else:
            # Legacy support (string base64 only)
            verification_docs = [{
                "file_name": None,
                "file_type": None,
                "file_data": user_data.verification_document,
                "uploaded_at": datetime.utcnow(),
            }]
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "profile": {
            "full_name": user_data.full_name,
            "university": user_data.university,
            "student_id": user_data.student_id,
            "client_type": user_data.client_type if user_data.role == UserRole.CLIENT else None,
            "verification_status": verification_status,
            "verification_documents": verification_docs,
            "verification_rejected_reason": None,
            "created_at": datetime.utcnow(),
            "last_login": None
        },
        "safety_score": 100.0,
        "is_active": True,
        "is_banned": False
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(result.inserted_id), "role": user_data.role}
    )
    
    # Update last login
    await db.users.update_one(
        {"_id": result.inserted_id},
        {"$set": {"profile.last_login": datetime.utcnow()}}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user_doc)
    }

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is banned
    if user.get("is_banned", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended"
        )
    
    # Handle role migration from 'student' to 'client' for backward compatibility
    role = user["role"]
    if role == "student":
        role = "client"
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "role": role}
    )
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"profile.last_login": datetime.utcnow()}}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
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
    """Upload verification document (Civil ID for clients, Company Registration for providers)"""
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_status = user.get("profile", {}).get("verification_status", "unverified")
    if current_status == VerificationStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Account is already verified")
    
    # Add document and set status to pending
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {
            """"$push": {"profile.verification_documents": doc_data.document},"""
            "$push": {"profile.verification_documents": {
                "file_name": doc_data.document.get("file_name"),
                "file_type": doc_data.document.get("file_type"),
                "file_data": doc_data.document.get("file_data"),
                "uploaded_at": datetime.utcnow(),
            }},
            "$set": {
                "profile.verification_status": VerificationStatus.PENDING,
                "profile.verification_rejected_reason": None
            }
        }
    )
    
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    return {
        "message": "Document uploaded successfully. Your account is pending verification.",
        "verification_status": updated_user["profile"]["verification_status"]
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
    
    try:
        user = await db.users.find_one({"_id": ObjectId(decision_data.user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if decision_data.decision not in ["verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'verified' or 'rejected'")
    
    update_data = {"profile.verification_status": decision_data.decision}
    if decision_data.decision == "rejected":
        if not decision_data.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        update_data["profile.verification_rejected_reason"] = decision_data.rejection_reason
    else:
        update_data["profile.verification_rejected_reason"] = None
    
    await db.users.update_one(
        {"_id": ObjectId(decision_data.user_id)},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": ObjectId(decision_data.user_id)})
    return {
        "message": f"User {decision_data.decision}",
        "user": serialize_user(updated_user)
    }

@api_router.get("/admin/pending-verifications")
async def get_pending_verifications(
    current_user: dict = Depends(get_current_user)
):
    """Get all users with pending verification"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cursor = db.users.find({"profile.verification_status": VerificationStatus.PENDING})
    users = await cursor.to_list(length=100)
    
    """return [serialize_user(user) for user in users]"""
    results = []

    for user in users:
        profile = user.get("profile", {})
        docs = profile.get("verification_documents", [])

        normalized_docs = []

        for d in docs:
            if isinstance(d, str):
                data_uri = f"data:application/octet-stream;base64,{d}"
                normalized_docs.append({
                    "file_name": None,
                    "file_type": None,
                    "file_data": d,
                    "uploaded_at": datetime.utcnow(),
                    "data_uri": data_uri
                })
            else:
                file_type = d.get("file_type") or "application/octet-stream"
                data_uri = f"data:{file_type};base64,{d.get('file_data')}"
                normalized_docs.append({
                    **d,
                    "data_uri": data_uri
                })

        serialized = serialize_user(user)
        serialized["profile"]["verification_documents"] = normalized_docs

        results.append(serialized)

    return results

@api_router.get("/admin/users")
async def admin_list_users(current_user: dict = Depends(get_current_user)):
    """List all users (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db.users.find({})
    users = await cursor.to_list(length=500)
    return [serialize_user(user) for user in users]

@api_router.get("/admin/services")
async def admin_list_services(current_user: dict = Depends(get_current_user)):
    """List all services (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db.services.find({})
    services = await cursor.to_list(length=500)
    result = []
    for s in services:
        provider = await db.users.find_one({"_id": s["provider_id"]})
        result.append(serialize_service(s, provider or {}))
    return result

@api_router.put("/admin/services/{service_id}/suspend")
async def admin_suspend_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Suspend a service (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.services.update_one({"_id": ObjectId(service_id)}, {"$set": {"status": "suspended"}})
    return {"message": "Service suspended"}

@api_router.put("/admin/services/{service_id}/unsuspend")
async def admin_unsuspend_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Unsuspend a service (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.services.update_one({"_id": ObjectId(service_id)}, {"$set": {"status": "active"}})
    return {"message": "Service unsuspended"}

@api_router.get("/admin/contracts")
async def admin_list_contracts(current_user: dict = Depends(get_current_user)):
    """List all contracts (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db.contracts.find({}).sort("created_at", -1)
    contracts = await cursor.to_list(length=500)
    result = []
    for c in contracts:
        student = await db.users.find_one({"_id": c["student_id"]})
        provider = await db.users.find_one({"_id": c["provider_id"]})
        service = await db.services.find_one({"_id": c["service_id"]})
        result.append({
            "id": str(c["_id"]),
            "student_id": str(c["student_id"]),
            "student_name": student["profile"]["full_name"] if student else "Unknown",
            "provider_id": str(c["provider_id"]),
            "provider_name": provider["profile"]["full_name"] if provider else "Unknown",
            "service_id": str(c["service_id"]),
            "service_title": service["title"] if service else "Unknown",
            "status": c["status"],
            "total_amount": c.get("total_amount", 0),
            "created_at": c.get("created_at", datetime.utcnow())
        })
    return result


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
    # Build query
    query = {"status": ServiceStatus.ACTIVE}
    
    if service_type:
        query["service_type"] = service_type
    if min_price is not None:
        query.setdefault("price_monthly", {})["$gte"] = min_price
    if max_price is not None:
        query.setdefault("price_monthly", {})["$lte"] = max_price
    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}
    if university:
        query["location.university_nearby"] = {"$regex": university, "$options": "i"}
    if min_rating is not None:
        query["rating.average"] = {"$gte": min_rating}
    
    # Get services
    cursor = db.services.find(query).skip(skip).limit(limit).sort("created_at", -1)
    services = await cursor.to_list(length=limit)
    
    # Get provider info for each service
    results = []
    for service in services:
        provider = await db.users.find_one({"_id": service["provider_id"]})
        if provider:
            results.append(serialize_service(service, provider))
    
    return results

@api_router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str):
    """Get service details"""
    try:
        service = await db.services.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service ID"
        )
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    provider = await db.users.find_one({"_id": service["provider_id"]})
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return serialize_service(service, provider)

@api_router.post("/services/search", response_model=list[ServiceResponse])
async def search_services(filters: ServiceFilters):
    """Advanced service search"""
    # Build query from filters
    query = {"status": ServiceStatus.ACTIVE}
    
    if filters.service_type:
        query["service_type"] = filters.service_type
    if filters.min_price is not None:
        query.setdefault("price_monthly", {})["$gte"] = filters.min_price
    if filters.max_price is not None:
        query.setdefault("price_monthly", {})["$lte"] = filters.max_price
    if filters.city:
        query["location.city"] = {"$regex": filters.city, "$options": "i"}
    if filters.university:
        query["location.university_nearby"] = {"$regex": filters.university, "$options": "i"}
    if filters.min_rating is not None:
        query["rating.average"] = {"$gte": filters.min_rating}
    if filters.gender_restriction:
        query["residence.gender_restriction"] = filters.gender_restriction
    if filters.amenities:
        query["$or"] = [
            {"transportation.amenities": {"$in": filters.amenities}},
            {"residence.amenities": {"$in": filters.amenities}}
        ]
    
    # Get services
    cursor = db.services.find(query).skip(filters.skip).limit(filters.limit).sort("created_at", -1)
    services = await cursor.to_list(length=filters.limit)
    
    # Get provider info
    results = []
    for service in services:
        provider = await db.users.find_one({"_id": service["provider_id"]})
        if provider:
            results.append(serialize_service(service, provider))
    
    return results


# Service Endpoints (Providers)
@api_router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new service listing (provider must be verified)"""
    # Only service providers can create services
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service providers can create services"
        )
    
    # Check verification status
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
        "provider_id": ObjectId(current_user["user_id"]),
        "service_type": service_data.service_type,
        "title": service_data.title,
        "description": service_data.description,
        "images": service_data.images,
        "price_monthly": service_data.price_monthly,
        "capacity": service_data.capacity,
        "available_slots": service_data.capacity,
        "location": service_data.location.model_dump(),
        "rating": {"average": 0.0, "count": 0},
        "safety_score": 100.0,
        "status": ServiceStatus.ACTIVE,
        "auto_accept": service_data.auto_accept,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    if service_data.transportation:
        service_doc["transportation"] = service_data.transportation.model_dump()
    if service_data.residence:
        service_doc["residence"] = service_data.residence.model_dump()
    
    result = await db.services.insert_one(service_doc)
    service_doc["_id"] = result.inserted_id
    
    # Get provider info
    provider = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return serialize_service(service_doc, provider)

@api_router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service_data: ServiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update service listing"""
    try:
        service = await db.services.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service ID"
        )
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check if user owns the service
    if str(service["provider_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own services"
        )
    
    # Build update document
    update_doc = {"updated_at": datetime.utcnow()}
    update_data = service_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            if key in ["location", "transportation", "residence"] and value:
                update_doc[key] = value if isinstance(value, dict) else value.model_dump()
            else:
                update_doc[key] = value
    
    # Update service
    await db.services.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": update_doc}
    )
    
    # Get updated service
    updated_service = await db.services.find_one({"_id": ObjectId(service_id)})
    provider = await db.users.find_one({"_id": service["provider_id"]})
    
    return serialize_service(updated_service, provider)

@api_router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete service listing"""
    try:
        service = await db.services.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service ID"
        )
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check if user owns the service
    if str(service["provider_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own services"
        )
    
    # Soft delete by setting status to inactive
    await db.services.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": {"status": ServiceStatus.INACTIVE, "updated_at": datetime.utcnow()}}
    )
    
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
    
    # Get services
    cursor = db.services.find(
        {"provider_id": ObjectId(current_user["user_id"])}
    ).skip(skip).limit(limit).sort("created_at", -1)
    
    services = await cursor.to_list(length=limit)
    
    # Get provider info
    provider = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return [serialize_service(service, provider) for service in services]


# Review Endpoints
@api_router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a service"""
    # Only students can create reviews
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create reviews"
        )
    
    # Check if service exists
    try:
        service = await db.services.find_one({"_id": ObjectId(review_data.service_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service ID"
        )
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check if user already reviewed this service
    existing_review = await db.reviews.find_one({
        "service_id": ObjectId(review_data.service_id),
        "student_id": ObjectId(current_user["user_id"])
    })
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this service"
        )
    
    # Create review document
    review_doc = {
        "service_id": ObjectId(review_data.service_id),
        "student_id": ObjectId(current_user["user_id"]),
        "rating": review_data.rating,
        "review_text": review_data.review_text,
        "safety_rating": review_data.safety_rating,
        "categories": review_data.categories.model_dump() if review_data.categories else None,
        "verified_booking": False,  # TODO: Check if user has actual booking
        "created_at": datetime.utcnow()
    }
    
    result = await db.reviews.insert_one(review_doc)
    review_doc["_id"] = result.inserted_id
    
    # Update service rating
    all_reviews = await db.reviews.find({"service_id": ObjectId(review_data.service_id)}).to_list(length=1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    
    await db.services.update_one(
        {"_id": ObjectId(review_data.service_id)},
        {"$set": {
            "rating.average": round(avg_rating, 2),
            "rating.count": len(all_reviews)
        }}
    )
    
    # Get student info
    student = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return serialize_review(review_doc, student)

@api_router.get("/reviews/service/{service_id}", response_model=list[ReviewResponse])
async def get_service_reviews(
    service_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get reviews for a service"""
    try:
        service = await db.services.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service ID"
        )
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Get reviews
    cursor = db.reviews.find(
        {"service_id": ObjectId(service_id)}
    ).skip(skip).limit(limit).sort("created_at", -1)
    
    reviews = await cursor.to_list(length=limit)
    
    # Get student info for each review
    results = []
    for review in reviews:
        student = await db.users.find_one({"_id": review["student_id"]})
        if student:
            results.append(serialize_review(review, student))
    
    return results


# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Muyassir API"}





# ============================================================
# CONTRACT ENDPOINTS - Phase 2
# ============================================================

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
    
    # Check verification status
    await require_verified_user(current_user["user_id"], "create contracts")
    
    # Get service
    try:
        service = await db.services.find_one({"_id": ObjectId(contract_data.service_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service ID"
        )
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check availability - block if no slots available
    available_slots = service.get("available_slots", service.get("capacity", 0))
    if available_slots <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available slots for this service. Please try another service or wait for availability."
        )
    
    # Get provider and student info
    provider = await db.users.find_one({"_id": service["provider_id"]})
    student = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    # Check provider verification status (safety check)
    provider_verification = provider.get("profile", {}).get("verification_status", "unverified")
    if provider_verification != VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This service provider is not yet verified. Please choose a verified provider."
        )
    
    # Calculate dates
    start_date = contract_data.start_date
    end_date = start_date + relativedelta(months=contract_data.duration_months)
    monthly_price = service["price_monthly"]
    total_amount = monthly_price * contract_data.duration_months
    
    # Generate contract terms
    terms = generate_contract_terms(
        service=service,
        provider=provider,
        student=student,
        duration_months=contract_data.duration_months,
        start_date=start_date
    )
    
    # Generate payment schedule
    payment_schedule = generate_payment_schedule(
        start_date=start_date,
        duration_months=contract_data.duration_months,
        monthly_price=monthly_price
    )
    
    # Determine initial status based on auto_accept setting
    auto_accept = service.get("auto_accept", False)
    
    if auto_accept:
        # Auto-accept flow: skip provider approval, go directly to awaiting student confirmation
        initial_status = ContractStatus.AWAITING_STUDENT_CONFIRMATION
        provider_signature = {
            "signed": True,
            "signed_at": datetime.utcnow(),
            "ip_address": "auto-accept"
        }
    else:
        # Normal flow: require provider approval first
        initial_status = ContractStatus.PENDING_PROVIDER_APPROVAL
        provider_signature = {
            "signed": False,
            "signed_at": None,
            "ip_address": None
        }
    
    # Create contract document
    contract_doc = {
        "student_id": ObjectId(current_user["user_id"]),
        "provider_id": service["provider_id"],
        "service_id": ObjectId(contract_data.service_id),
        "start_date": datetime.combine(start_date, datetime.min.time()),
        "end_date": datetime.combine(end_date, datetime.min.time()),
        "monthly_price": monthly_price,
        "duration_months": contract_data.duration_months,
        "total_amount": total_amount,
        "auto_generated_terms": terms,
        "student_signature": {
            "signed": False,
            "signed_at": None,
            "ip_address": None
        },
        "provider_signature": provider_signature,
        "payment_schedule": payment_schedule,
        "status": initial_status,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.contracts.insert_one(contract_doc)
    contract_doc["_id"] = result.inserted_id
    
    # Note: Don't decrease slots yet - only after contract becomes ACTIVE
    
    return {
        "id": str(contract_doc["_id"]),
        "student_id": str(contract_doc["student_id"]),
        "student_name": student["profile"]["full_name"],
        "provider_id": str(contract_doc["provider_id"]),
        "provider_name": provider["profile"]["full_name"],
        "service_id": str(contract_doc["service_id"]),
        "service_title": service["title"],
        "start_date": contract_doc["start_date"],
        "end_date": contract_doc["end_date"],
        "monthly_price": contract_doc["monthly_price"],
        "duration_months": contract_doc["duration_months"],
        "total_amount": contract_doc["total_amount"],
        "auto_generated_terms": contract_doc["auto_generated_terms"],
        "student_signature": contract_doc["student_signature"],
        "provider_signature": contract_doc["provider_signature"],
        "payment_schedule": contract_doc["payment_schedule"],
        "status": contract_doc["status"],
        "created_at": contract_doc["created_at"],
        "updated_at": contract_doc["updated_at"]
    }


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
    
    cursor = db.contracts.find(
        {"student_id": ObjectId(current_user["user_id"])}
    ).skip(skip).limit(limit).sort("created_at", -1)
    
    contracts = await cursor.to_list(length=limit)
    results = []
    
    for contract in contracts:
        student = await db.users.find_one({"_id": contract["student_id"]})
        provider = await db.users.find_one({"_id": contract["provider_id"]})
        service = await db.services.find_one({"_id": contract["service_id"]})
        
        results.append({
            "id": str(contract["_id"]),
            "student_id": str(contract["student_id"]),
            "student_name": student["profile"]["full_name"],
            "provider_id": str(contract["provider_id"]),
            "provider_name": provider["profile"]["full_name"],
            "service_id": str(contract["service_id"]),
            "service_title": service["title"],
            "start_date": contract["start_date"],
            "end_date": contract["end_date"],
            "monthly_price": contract["monthly_price"],
            "duration_months": contract["duration_months"],
            "total_amount": contract["total_amount"],
            "auto_generated_terms": contract["auto_generated_terms"],
            "student_signature": contract["student_signature"],
            "provider_signature": contract["provider_signature"],
            "payment_schedule": contract["payment_schedule"],
            "status": contract["status"],
            "created_at": contract["created_at"],
            "updated_at": contract["updated_at"]
        })
    
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
    
    cursor = db.contracts.find(
        {"provider_id": ObjectId(current_user["user_id"])}
    ).skip(skip).limit(limit).sort("created_at", -1)
    
    contracts = await cursor.to_list(length=limit)
    results = []
    
    for contract in contracts:
        student = await db.users.find_one({"_id": contract["student_id"]})
        provider = await db.users.find_one({"_id": contract["provider_id"]})
        service = await db.services.find_one({"_id": contract["service_id"]})
        
        results.append({
            "id": str(contract["_id"]),
            "student_id": str(contract["student_id"]),
            "student_name": student["profile"]["full_name"],
            "provider_id": str(contract["provider_id"]),
            "provider_name": provider["profile"]["full_name"],
            "service_id": str(contract["service_id"]),
            "service_title": service["title"],
            "start_date": contract["start_date"],
            "end_date": contract["end_date"],
            "monthly_price": contract["monthly_price"],
            "duration_months": contract["duration_months"],
            "total_amount": contract["total_amount"],
            "auto_generated_terms": contract["auto_generated_terms"],
            "student_signature": contract["student_signature"],
            "provider_signature": contract["provider_signature"],
            "payment_schedule": contract["payment_schedule"],
            "status": contract["status"],
            "created_at": contract["created_at"],
            "updated_at": contract["updated_at"]
        })
    
    return results


@api_router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get contract details"""
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid contract ID"
        )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check access
    user_id = ObjectId(current_user["user_id"])
    if contract["student_id"] != user_id and contract["provider_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this contract"
        )
    
    student = await db.users.find_one({"_id": contract["student_id"]})
    provider = await db.users.find_one({"_id": contract["provider_id"]})
    service = await db.services.find_one({"_id": contract["service_id"]})
    
    return {
        "id": str(contract["_id"]),
        "student_id": str(contract["student_id"]),
        "student_name": student["profile"]["full_name"],
        "provider_id": str(contract["provider_id"]),
        "provider_name": provider["profile"]["full_name"],
        "service_id": str(contract["service_id"]),
        "service_title": service["title"],
        "start_date": contract["start_date"],
        "end_date": contract["end_date"],
        "monthly_price": contract["monthly_price"],
        "duration_months": contract["duration_months"],
        "total_amount": contract["total_amount"],
        "auto_generated_terms": contract["auto_generated_terms"],
        "student_signature": contract["student_signature"],
        "provider_signature": contract["provider_signature"],
        "payment_schedule": contract["payment_schedule"],
        "status": contract["status"],
        "created_at": contract["created_at"],
        "updated_at": contract["updated_at"]
    }


@api_router.post("/contracts/{contract_id}/provider-accept", response_model=ContractResponse)
async def provider_accept_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Provider accepts a contract request"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(status_code=403, detail="Only providers can accept contracts")
    
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid contract ID")
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["provider_id"] != ObjectId(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.PENDING_PROVIDER_APPROVAL:
        raise HTTPException(status_code=400, detail=f"Contract is not pending approval (status: {contract['status']})")
    
    # Provider accepts - move to awaiting student confirmation
    update_data = {
        "status": ContractStatus.AWAITING_STUDENT_CONFIRMATION,
        "provider_signature": {
            "signed": True,
            "signed_at": datetime.utcnow(),
            "ip_address": "0.0.0.0"
        },
        "updated_at": datetime.utcnow()
    }
    
    await db.contracts.update_one({"_id": ObjectId(contract_id)}, {"$set": update_data})
    
    updated_contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    student = await db.users.find_one({"_id": updated_contract["student_id"]})
    provider = await db.users.find_one({"_id": updated_contract["provider_id"]})
    service = await db.services.find_one({"_id": updated_contract["service_id"]})
    
    return serialize_contract(updated_contract, student, provider, service)


@api_router.post("/contracts/{contract_id}/provider-reject", response_model=ContractResponse)
async def provider_reject_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Provider rejects a contract request"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(status_code=403, detail="Only providers can reject contracts")
    
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid contract ID")
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["provider_id"] != ObjectId(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.PENDING_PROVIDER_APPROVAL:
        raise HTTPException(status_code=400, detail="Contract is not pending approval")
    
    # Provider rejects
    update_data = {
        "status": ContractStatus.REJECTED,
        "updated_at": datetime.utcnow()
    }
    
    await db.contracts.update_one({"_id": ObjectId(contract_id)}, {"$set": update_data})
    
    updated_contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    student = await db.users.find_one({"_id": updated_contract["student_id"]})
    provider = await db.users.find_one({"_id": updated_contract["provider_id"]})
    service = await db.services.find_one({"_id": updated_contract["service_id"]})
    
    return serialize_contract(updated_contract, student, provider, service)


@api_router.post("/contracts/{contract_id}/student-confirm", response_model=ContractResponse)
async def student_confirm_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Student confirms and activates contract (after provider approval)"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only students can confirm contracts")
    
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid contract ID")
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["student_id"] != ObjectId(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.AWAITING_STUDENT_CONFIRMATION:
        raise HTTPException(status_code=400, detail="Contract is not awaiting your confirmation")
    
    # Student confirms - contract becomes ACTIVE and capacity is reserved
    update_data = {
        "status": ContractStatus.ACTIVE,
        "student_signature": {
            "signed": True,
            "signed_at": datetime.utcnow(),
            "ip_address": "0.0.0.0"
        },
        "updated_at": datetime.utcnow()
    }
    
    await db.contracts.update_one({"_id": ObjectId(contract_id)}, {"$set": update_data})
    
    # Now reserve capacity
    await db.services.update_one(
        {"_id": contract["service_id"]},
        {"$inc": {"available_slots": -1}}
    )
    
    updated_contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    student = await db.users.find_one({"_id": updated_contract["student_id"]})
    provider = await db.users.find_one({"_id": updated_contract["provider_id"]})
    service = await db.services.find_one({"_id": updated_contract["service_id"]})
    
    return serialize_contract(updated_contract, student, provider, service)


def serialize_contract(contract, student, provider, service):
    """Helper to serialize contract response"""
    return {
        "id": str(contract["_id"]),
        "student_id": str(contract["student_id"]),
        "student_name": student["profile"]["full_name"],
        "provider_id": str(contract["provider_id"]),
        "provider_name": provider["profile"]["full_name"],
        "service_id": str(contract["service_id"]),
        "service_title": service["title"],
        "start_date": contract["start_date"],
        "end_date": contract["end_date"],
        "monthly_price": contract["monthly_price"],
        "duration_months": contract["duration_months"],
        "total_amount": contract["total_amount"],
        "auto_generated_terms": contract["auto_generated_terms"],
        "student_signature": contract["student_signature"],
        "provider_signature": contract["provider_signature"],
        "payment_schedule": contract["payment_schedule"],
        "status": contract["status"],
        "created_at": contract["created_at"],
        "updated_at": contract["updated_at"]
    }


@api_router.post("/contracts/{contract_id}/sign", response_model=ContractResponse)
async def sign_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Legacy sign endpoint - redirects to appropriate action"""
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid contract ID"
        )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    user_id = ObjectId(current_user["user_id"])
    
    # Route to appropriate action based on role and status
    if contract["provider_id"] == user_id:
        if contract["status"] == ContractStatus.PENDING_PROVIDER_APPROVAL:
            return await provider_accept_contract(contract_id, current_user)
        else:
            raise HTTPException(status_code=400, detail="No action needed from provider")
    elif contract["student_id"] == user_id:
        if contract["status"] == ContractStatus.AWAITING_STUDENT_CONFIRMATION:
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
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid contract ID"
        )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check access
    user_id = ObjectId(current_user["user_id"])
    if contract["student_id"] != user_id and contract["provider_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this contract"
        )
    
    # Update status
    await db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": {
            "status": ContractStatus.CANCELLED,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Restore available slots
    await db.services.update_one(
        {"_id": contract["service_id"]},
        {"$inc": {"available_slots": 1}}
    )
    
    # Get updated contract
    updated_contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    student = await db.users.find_one({"_id": updated_contract["student_id"]})
    provider = await db.users.find_one({"_id": updated_contract["provider_id"]})
    service = await db.services.find_one({"_id": updated_contract["service_id"]})
    
    return {
        "id": str(updated_contract["_id"]),
        "student_id": str(updated_contract["student_id"]),
        "student_name": student["profile"]["full_name"],
        "provider_id": str(updated_contract["provider_id"]),
        "provider_name": provider["profile"]["full_name"],
        "service_id": str(updated_contract["service_id"]),
        "service_title": service["title"],
        "start_date": updated_contract["start_date"],
        "end_date": updated_contract["end_date"],
        "monthly_price": updated_contract["monthly_price"],
        "duration_months": updated_contract["duration_months"],
        "total_amount": updated_contract["total_amount"],
        "auto_generated_terms": updated_contract["auto_generated_terms"],
        "student_signature": updated_contract["student_signature"],
        "provider_signature": updated_contract["provider_signature"],
        "payment_schedule": updated_contract["payment_schedule"],
        "status": updated_contract["status"],
        "created_at": updated_contract["created_at"],
        "updated_at": updated_contract["updated_at"]
    }


@api_router.put("/contracts/{contract_id}/complete", response_model=ContractResponse)
async def complete_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an ACTIVE contract as COMPLETED (student only)"""
    if current_user["role"] != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can mark contracts as completed"
        )
    
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid contract ID")
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["student_id"] != ObjectId(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract["status"] != ContractStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Only ACTIVE contracts can be marked as completed")
    
    # Mark as completed
    await db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": {"status": ContractStatus.COMPLETED, "updated_at": datetime.utcnow()}}
    )
    
    updated_contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    student = await db.users.find_one({"_id": updated_contract["student_id"]})
    provider = await db.users.find_one({"_id": updated_contract["provider_id"]})
    service = await db.services.find_one({"_id": updated_contract["service_id"]})
    
    return serialize_contract(updated_contract, student, provider, service)


# ============================================================
# PAYMENT ENDPOINTS - Phase 2
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
    
    # Get contract
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(payment_data.contract_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid contract ID"
        )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Verify student owns contract
    if str(contract["student_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only pay for your own contracts"
        )
    
    # Calculate revenue split
    split = calculate_revenue_split(payment_data.amount)
    
    # Generate transaction ID
    transaction_id = generate_transaction_id()
    
    # Create payment record
    payment_doc = {
        "contract_id": ObjectId(payment_data.contract_id),
        "student_id": contract["student_id"],
        "provider_id": contract["provider_id"],
        "amount": payment_data.amount,
        "provider_amount": split["provider_amount"],
        "platform_fee": split["platform_fee"],
        "payment_method": payment_data.payment_method,
        "transaction_id": transaction_id,
        "status": PaymentStatus.PAID,
        "paid_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.payments.insert_one(payment_doc)
    payment_doc["_id"] = result.inserted_id
    
    # Update payment schedule (mark first pending as paid)
    payment_schedule = contract["payment_schedule"]
    for item in payment_schedule:
        if item["status"] == "pending":
            item["status"] = "paid"
            item["paid_at"] = datetime.utcnow()
            item["transaction_id"] = transaction_id
            break
    
    await db.contracts.update_one(
        {"_id": ObjectId(payment_data.contract_id)},
        {"$set": {"payment_schedule": payment_schedule, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "id": str(payment_doc["_id"]),
        "contract_id": str(payment_doc["contract_id"]),
        "student_id": str(payment_doc["student_id"]),
        "provider_id": str(payment_doc["provider_id"]),
        "amount": payment_doc["amount"],
        "provider_amount": payment_doc["provider_amount"],
        "platform_fee": payment_doc["platform_fee"],
        "payment_method": payment_doc["payment_method"],
        "transaction_id": payment_doc["transaction_id"],
        "status": payment_doc["status"],
        "paid_at": payment_doc["paid_at"],
        "created_at": payment_doc["created_at"]
    }


@api_router.get("/payments/contract/{contract_id}", response_model=list[PaymentResponse])
async def get_contract_payments(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all payments for a contract"""
    try:
        contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid contract ID"
        )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check access
    user_id = ObjectId(current_user["user_id"])
    if contract["student_id"] != user_id and contract["provider_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this contract's payments"
        )
    
    cursor = db.payments.find(
        {"contract_id": ObjectId(contract_id)}
    ).sort("created_at", -1)
    
    payments = await cursor.to_list(length=1000)
    
    return [{
        "id": str(p["_id"]),
        "contract_id": str(p["contract_id"]),
        "student_id": str(p["student_id"]),
        "provider_id": str(p["provider_id"]),
        "amount": p["amount"],
        "provider_amount": p["provider_amount"],
        "platform_fee": p["platform_fee"],
        "payment_method": p["payment_method"],
        "transaction_id": p["transaction_id"],
        "status": p["status"],
        "paid_at": p["paid_at"],
        "created_at": p["created_at"]
    } for p in payments]


@api_router.get("/payments/provider/earnings")
async def get_provider_earnings(
    current_user: dict = Depends(get_current_user)
):
    """Get provider's earnings dashboard"""
    if current_user["role"] != UserRole.SERVICE_PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only providers can access earnings"
        )
    
    # Get all payments for this provider
    cursor = db.payments.find(
        {"provider_id": ObjectId(current_user["user_id"])}
    )
    
    payments = await cursor.to_list(length=10000)
    
    # Calculate totals
    total_earnings = sum(p["provider_amount"] for p in payments)
    total_transactions = len(payments)
    total_gross = sum(p["amount"] for p in payments)
    total_platform_fees = sum(p["platform_fee"] for p in payments)
    
    return {
        "total_earnings": round(total_earnings, 2),
        "total_transactions": total_transactions,
        "total_gross": round(total_gross, 2),
        "total_platform_fees": round(total_platform_fees, 2),
        "recent_payments": [{
            "id": str(p["_id"]),
            "amount": p["amount"],
            "provider_amount": p["provider_amount"],
            "platform_fee": p["platform_fee"],
            "transaction_id": p["transaction_id"],
            "paid_at": p["paid_at"]
        } for p in payments[:10]]
    }

# Include router in app
app.include_router(api_router)


# ==================== CHAT ENDPOINTS ====================

@api_router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create or get existing conversation between two users"""
    try:
        other_user = await db.users.find_one({"_id": ObjectId(data.participant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid participant ID")
    
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = current_user["user_id"]
    participants = sorted([user_id, data.participant_id])
    
    # Check if conversation exists
    existing = await db.conversations.find_one({"participants": participants})
    if existing:
        return await serialize_conversation(existing, user_id)
    
    # Create new conversation
    conv_doc = {
        "participants": participants,
        "contract_id": data.contract_id,
        "last_message": None,
        "last_message_time": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.conversations.insert_one(conv_doc)
    conv_doc["_id"] = result.inserted_id
    
    return await serialize_conversation(conv_doc, user_id)

@api_router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    user_id = current_user["user_id"]
    cursor = db.conversations.find({"participants": user_id}).sort("updated_at", -1)
    conversations = await cursor.to_list(length=100)
    return [await serialize_conversation(conv, user_id) for conv in conversations]

@api_router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get messages from a conversation"""
    try:
        conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    if not conv or current_user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("timestamp", 1).skip(skip).limit(limit)
    messages = await cursor.to_list(length=limit)
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user["user_id"]}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return [serialize_message(msg) for msg in messages]

@api_router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a conversation"""
    try:
        conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    if not conv or current_user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    sender_name = user.get("profile", {}).get("full_name", "Unknown")
    
    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": current_user["user_id"],
        "sender_name": sender_name,
        "content": data.content,
        "timestamp": datetime.utcnow(),
        "is_read": False
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id
    
    # Update conversation
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"last_message": data.content[:50], "last_message_time": msg_doc["timestamp"], "updated_at": datetime.utcnow()}}
    )
    
    return serialize_message(msg_doc)

async def serialize_conversation(conv_doc: dict, current_user_id: str) -> dict:
    """Serialize conversation with participant details"""
    participants = []
    for p_id in conv_doc["participants"]:
        user = await db.users.find_one({"_id": ObjectId(p_id)})
        if user:
            participants.append({
                "id": str(user["_id"]),
                "name": user.get("profile", {}).get("full_name", "Unknown"),
                "role": user.get("role", "unknown")
            })
    
    # Count unread messages
    unread = await db.messages.count_documents({
        "conversation_id": str(conv_doc["_id"]),
        "sender_id": {"$ne": current_user_id},
        "is_read": False
    })
    
    return {
        "id": str(conv_doc["_id"]),
        "participants": participants,
        "contract_id": conv_doc.get("contract_id"),
        "last_message": conv_doc.get("last_message"),
        "last_message_time": conv_doc.get("last_message_time"),
        "unread_count": unread,
        "created_at": conv_doc["created_at"],
        "updated_at": conv_doc["updated_at"]
    }

def serialize_message(msg_doc: dict) -> dict:
    return {
        "id": str(msg_doc["_id"]),
        "conversation_id": msg_doc["conversation_id"],
        "sender_id": msg_doc["sender_id"],
        "sender_name": msg_doc["sender_name"],
        "content": msg_doc["content"],
        "timestamp": msg_doc["timestamp"],
        "is_read": msg_doc.get("is_read", False)
    }


@app.on_event("startup")
async def startup_event():
    await create_indexes()
    # Chat indexes
    await db.conversations.create_index("participants")
    await db.messages.create_index([("conversation_id", 1), ("timestamp", 1)])
    logger.info("Muyassir API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("Database connection closed")
