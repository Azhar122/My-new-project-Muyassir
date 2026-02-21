from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class VerificationDocument(BaseModel):
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_data: str


class UserRole(str, Enum):
    CLIENT = "client"
    SERVICE_PROVIDER = "service_provider"
    ADMIN = "admin"

class ClientType(str, Enum):
    STUDENT = "student"
    EMPLOYEE = "employee"

class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class ServiceType(str, Enum):
    TRANSPORTATION = "transportation"
    RESIDENCE = "residence"

class ServiceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class GenderRestriction(str, Enum):
    MALE = "male"
    FEMALE = "female"
    ANY = "any"

class ResidenceType(str, Enum):
    APARTMENT = "apartment"
    ROOM = "room"
    SHARED = "shared"

class ContractStatus(str, Enum):
    DRAFT = "draft"
    PENDING_PROVIDER_APPROVAL = "pending_provider_approval"
    AWAITING_STUDENT_CONFIRMATION = "awaiting_student_confirmation"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    REFUNDED = "refunded"

# User Models
class UserProfile(BaseModel):
    full_name: str
    phone_masked: Optional[str] = None
    university: Optional[str] = None
    student_id: Optional[str] = None
    profile_picture: Optional[str] = None
    client_type: Optional[str] = None  # "student" or "employee" (for clients only)
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    '''verification_documents: List[VerificationDocument] = []'''
    verification_documents: List[VerificationDocument] = Field(default_factory=list)  # Base64 encoded documents
    verification_rejected_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    full_name: str
    client_type: Optional[str] = None  # Required if role is CLIENT
    university: Optional[str] = None
    student_id: Optional[str] = None
    verification_document: Optional[str] = None  # Base64 encoded Civil ID or Company Registration

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    profile: UserProfile
    safety_score: float
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Service Models
class LocationCoordinates(BaseModel):
    lat: float
    lng: float

class ServiceLocation(BaseModel):
    address: str
    coordinates: LocationCoordinates
    city: str
    university_nearby: str

class RoutePoint(BaseModel):
    point: str
    time: str

class TransportationDetails(BaseModel):
    vehicle_type: str
    vehicle_number: Optional[str] = None
    route: List[RoutePoint] = []
    pickup_times: List[str] = []
    amenities: List[str] = []

class ResidenceDetails(BaseModel):
    residence_type: ResidenceType
    bedrooms: int
    bathrooms: int
    furnished: bool
    amenities: List[str] = []
    gender_restriction: GenderRestriction
    lease_duration_months: int

class ServiceRating(BaseModel):
    average: float = 0.0
    count: int = 0

class ServiceCreate(BaseModel):
    service_type: ServiceType
    title: str = Field(..., min_length=1)
    description: str
    category: str = Field(..., min_length=1)
    images: List[str] = []
    price_monthly: float = Field(..., gt=0)
    capacity: int
    location: ServiceLocation
    transportation: Optional[TransportationDetails] = None
    residence: Optional[ResidenceDetails] = None
    auto_accept: bool = False  # If True, skip provider approval step

class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    images: Optional[List[str]] = None
    price_monthly: Optional[float] = Field(default=None, gt=0)
    capacity: Optional[int] = None
    available_slots: Optional[int] = None
    location: Optional[ServiceLocation] = None
    transportation: Optional[TransportationDetails] = None
    residence: Optional[ResidenceDetails] = None
    status: Optional[ServiceStatus] = None
    auto_accept: Optional[bool] = None  # If True, skip provider approval step

class ServiceResponse(BaseModel):
    id: str
    provider_id: str
    provider_name: str
    service_type: ServiceType
    title: str
    description: str
    category: Optional[str] = "general"
    images: List[str]
    price_monthly: float
    capacity: int
    available_slots: int
    location: ServiceLocation
    transportation: Optional[TransportationDetails] = None
    residence: Optional[ResidenceDetails] = None
    rating: ServiceRating
    safety_score: float
    status: ServiceStatus
    auto_accept: bool = False  # If True, skip provider approval step
    created_at: datetime
    updated_at: datetime

# Review Models
class ReviewCategories(BaseModel):
    punctuality: Optional[int] = None
    cleanliness: Optional[int] = None
    communication: Optional[int] = None
    value_for_money: Optional[int] = None

class ReviewCreate(BaseModel):
    service_id: str
    rating: int = Field(ge=1, le=5)
    review_text: str
    safety_rating: int = Field(ge=1, le=5)
    categories: Optional[ReviewCategories] = None

class ReviewResponse(BaseModel):
    id: str
    service_id: str
    student_id: str
    student_name: str
    rating: int
    review_text: str
    safety_rating: int
    categories: Optional[ReviewCategories]
    verified_booking: bool
    created_at: datetime
    provider_response: Optional[str] = None
    provider_response_at: Optional[datetime] = None

# Search and Filter
class ServiceFilters(BaseModel):
    service_type: Optional[ServiceType] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    city: Optional[str] = None
    university: Optional[str] = None
    min_rating: Optional[float] = None
    gender_restriction: Optional[GenderRestriction] = None
    amenities: Optional[List[str]] = None
    skip: int = 0
    limit: int = 20


# Contract Models
class ContractSignature(BaseModel):
    signed: bool = False
    signed_at: Optional[datetime] = None
    ip_address: Optional[str] = None

class PaymentScheduleItem(BaseModel):
    due_date: date
    amount: float
    status: PaymentStatus = PaymentStatus.PENDING
    paid_at: Optional[datetime] = None
    transaction_id: Optional[str] = None

class ContractCreate(BaseModel):
    service_id: str
    start_date: date
    duration_months: int

class ContractUpdate(BaseModel):
    status: Optional[ContractStatus] = None

class ContractResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    provider_id: str
    provider_name: str
    service_id: str
    service_title: str
    start_date: date
    end_date: date
    monthly_price: float
    duration_months: int
    total_amount: float
    auto_generated_terms: str
    student_signature: ContractSignature
    provider_signature: ContractSignature
    payment_schedule: List[PaymentScheduleItem]
    status: ContractStatus
    created_at: datetime
    updated_at: datetime

# Payment Models
class PaymentCreate(BaseModel):
    contract_id: str
    amount: float
    payment_method: str = "mock_card"

class PaymentResponse(BaseModel):
    id: str
    contract_id: str
    student_id: str
    provider_id: str
    amount: float
    provider_amount: float  # 90%
    platform_fee: float  # 10%
    payment_method: str
    transaction_id: str
    status: PaymentStatus
    paid_at: datetime
    created_at: datetime

class InvoiceResponse(BaseModel):
    id: str
    contract_id: str
    payment_id: str
    invoice_number: str
    student_name: str
    provider_name: str
    service_title: str
    amount: float
    issue_date: datetime
    due_date: date
    payment_status: PaymentStatus


# Chat Models
class ConversationCreate(BaseModel):
    participant_id: str  # The other user to start a conversation with
    contract_id: Optional[str] = None  # Optional link to a contract

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    content: str
    timestamp: datetime
    is_read: bool

class ConversationResponse(BaseModel):
    id: str
    participants: List[Dict[str, Any]]  # List of {id, name, role}
    contract_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime
