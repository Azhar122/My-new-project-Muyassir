export enum UserRole {
  CLIENT = 'client',
  SERVICE_PROVIDER = 'service_provider',
  ADMIN = 'admin'
}

export enum ClientType {
  STUDENT = 'student',
  EMPLOYEE = 'employee'
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export enum ServiceType {
  TRANSPORTATION = 'transportation',
  RESIDENCE = 'residence'
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum GenderRestriction {
  MALE = 'male',
  FEMALE = 'female',
  ANY = 'any'
}

export enum ResidenceType {
  APARTMENT = 'apartment',
  ROOM = 'room',
  SHARED = 'shared'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  safety_score: number;
  is_active: boolean;
}

export interface UserProfile {
  full_name: string;
  phone_masked?: string;
  university?: string;
  student_id?: string;
  profile_picture?: string;
  client_type?: string;
  verification_status: VerificationStatus;
  verification_documents: string[];
  verification_rejected_reason?: string;
  created_at: string;
  last_login?: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface ServiceLocation {
  address: string;
  coordinates: LocationCoordinates;
  city: string;
  university_nearby: string;
}

export interface RoutePoint {
  point: string;
  time: string;
}

export interface TransportationDetails {
  vehicle_type: string;
  vehicle_number?: string;
  route: RoutePoint[];
  pickup_times: string[];
  amenities: string[];
}

export interface ResidenceDetails {
  residence_type: ResidenceType;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  amenities: string[];
  gender_restriction: GenderRestriction;
  lease_duration_months: number;
}

export interface ServiceRating {
  average: number;
  count: number;
}

export interface Service {
  id: string;
  provider_id: string;
  provider_name: string;
  service_type: ServiceType;
  title: string;
  description: string;
  images: string[];
  price_monthly: number;
  capacity: number;
  available_slots: number;
  location: ServiceLocation;
  transportation?: TransportationDetails;
  residence?: ResidenceDetails;
  rating: ServiceRating;
  safety_score: number;
  status: ServiceStatus;
  auto_accept: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewCategories {
  punctuality?: number;
  cleanliness?: number;
  communication?: number;
  value_for_money?: number;
}

export interface Review {
  id: string;
  service_id: string;
  student_id: string;
  student_name: string;
  rating: number;
  review_text: string;
  safety_rating: number;
  categories?: ReviewCategories;
  verified_booking: boolean;
  created_at: string;
  provider_response?: string;
  provider_response_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Contract Types
export enum ContractStatus {
  DRAFT = 'draft',
  PENDING_PROVIDER_APPROVAL = 'pending_provider_approval',
  AWAITING_STUDENT_CONFIRMATION = 'awaiting_student_confirmation',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export interface ContractSignature {
  signed: boolean;
  signed_at?: string;
  ip_address?: string;
}

export interface PaymentScheduleItem {
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
  transaction_id?: string;
}

export interface Contract {
  id: string;
  service_id: string;
  student_id: string;
  provider_id: string;
  status: ContractStatus;
  auto_generated_terms: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  monthly_amount: number;
  total_amount: number;
  currency: string;
  student_signature: ContractSignature;
  provider_signature: ContractSignature;
  payment_schedule: PaymentScheduleItem[];
  created_at: string;
  updated_at: string;
  // Populated fields
  service?: Service;
  student_name?: string;
  provider_name?: string;
}

export interface Payment {
  id: string;
  contract_id: string;
  student_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  transaction_id: string;
  provider_amount: number;
  platform_fee: number;
  payment_date: string;
  created_at: string;
}

export interface ProviderEarnings {
  total_earnings: number;
  total_platform_fees: number;
  net_earnings: number;
  payment_count: number;
  currency: string;
}