# Muyassir Platform - Technical Specification

## Product Overview
Muyassir (مُيسر) is a secure, AI-powered student transportation and residence contracting platform that replaces unsafe informal processes with a controlled, intelligent digital ecosystem.

## Core Principles
1. **Student Safety First** - Zero exposure of personal contact details
2. **Real-time Communication** - In-app messaging only with monitoring
3. **Automated Contracts** - Digital signing and escrow payments
4. **Accountability** - Full audit trail and safety scores
5. **Scalability** - University-scale to city-scale

## Technology Stack
- **Frontend**: React Native + Expo (iOS/Android)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **AI**: OpenAI GPT (via Emergent LLM key)
- **Maps**: Google Maps (integration ready)

## System Architecture

### User Roles
1. **Student** - End user (browse, contract, communicate)
2. **Service Provider** - Transportation/Residence providers
3. **Admin** - Platform oversight and moderation

### Database Schema

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password_hash: String,
  role: Enum["student", "service_provider", "admin"],
  profile: {
    full_name: String,
    phone_masked: String, // Never exposed to other users
    university: String,
    student_id: String (for students),
    profile_picture: String (base64),
    verification_status: Enum["pending", "verified", "rejected"],
    verification_documents: Array,
    created_at: Date,
    last_login: Date
  },
  safety_score: Number (0-100),
  is_active: Boolean,
  is_banned: Boolean,
  ban_reason: String
}
```

#### Services Collection
```javascript
{
  _id: ObjectId,
  provider_id: ObjectId (ref: Users),
  service_type: Enum["transportation", "residence"],
  
  // Common fields
  title: String,
  description: String,
  images: Array<String>, // base64
  price_monthly: Number,
  capacity: Number,
  available_slots: Number,
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    city: String,
    university_nearby: String
  },
  
  // Transportation specific
  transportation: {
    vehicle_type: String,
    vehicle_number: String,
    route: Array<{point: String, time: String}>,
    pickup_times: Array<String>,
    amenities: Array<String>
  },
  
  // Residence specific
  residence: {
    residence_type: Enum["apartment", "room", "shared"],
    bedrooms: Number,
    bathrooms: Number,
    furnished: Boolean,
    amenities: Array<String>,
    gender_restriction: Enum["male", "female", "any"],
    lease_duration_months: Number
  },
  
  rating: {
    average: Number,
    count: Number
  },
  safety_score: Number,
  status: Enum["active", "inactive", "suspended"],
  created_at: Date,
  updated_at: Date
}
```

#### Contracts Collection
```javascript
{
  _id: ObjectId,
  student_id: ObjectId (ref: Users),
  provider_id: ObjectId (ref: Users),
  service_id: ObjectId (ref: Services),
  
  contract_details: {
    start_date: Date,
    end_date: Date,
    monthly_price: Number,
    duration_months: Number,
    auto_generated_terms: String,
    special_terms: String
  },
  
  signatures: {
    student_signed: Boolean,
    student_signed_at: Date,
    provider_signed: Boolean,
    provider_signed_at: Date
  },
  
  payment_schedule: Array<{
    due_date: Date,
    amount: Number,
    status: Enum["pending", "paid", "overdue"],
    paid_at: Date
  }>,
  
  status: Enum["draft", "pending_signatures", "active", "completed", "cancelled"],
  created_at: Date,
  updated_at: Date
}
```

#### Messages Collection
```javascript
{
  _id: ObjectId,
  conversation_id: ObjectId,
  sender_id: ObjectId (ref: Users),
  sender_role: String,
  recipient_id: ObjectId (ref: Users),
  recipient_role: String,
  
  message: {
    text: String,
    original_text: String, // before moderation
    timestamp: Date,
    read_at: Date
  },
  
  moderation: {
    flagged: Boolean,
    reason: String,
    score: Number,
    action: Enum["allow", "flag", "block"]
  },
  
  metadata: {
    related_service_id: ObjectId,
    related_contract_id: ObjectId
  }
}
```

#### Reviews Collection
```javascript
{
  _id: ObjectId,
  service_id: ObjectId (ref: Services),
  student_id: ObjectId (ref: Users),
  contract_id: ObjectId (ref: Contracts),
  
  rating: Number (1-5),
  review_text: String,
  safety_rating: Number (1-5),
  
  categories: {
    punctuality: Number,
    cleanliness: Number,
    communication: Number,
    value_for_money: Number
  },
  
  verified_booking: Boolean,
  created_at: Date,
  provider_response: String,
  provider_response_at: Date
}
```

## API Endpoints - Phase 1

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user
- PUT /api/auth/profile - Update profile
- POST /api/auth/verify - Submit verification documents

### Services (Students)
- GET /api/services - List services with filters
- GET /api/services/:id - Get service details
- POST /api/services/search - Advanced search
- GET /api/services/:id/reviews - Get service reviews

### Services (Providers)
- POST /api/services - Create service listing
- PUT /api/services/:id - Update service
- DELETE /api/services/:id - Delete service
- GET /api/services/my-listings - Get provider's listings
- GET /api/services/:id/bookings - Get service bookings

### Reviews
- POST /api/reviews - Create review
- GET /api/reviews/service/:id - Get service reviews

## Mobile App Structure

### Navigation g
**Tab Navigation** (Bottom tabs for main sections)
- Students: Home | Browse | Messages | Profile
- Providers: Home | Listings | Messages | Profile

### Screen Hierarchy

#### Shared Screens
- Welcome/Onboarding
- Role Selection
- Login
- Register
- Profile Settings
- Verification Upload

#### Student Screens
1. Home - Dashboard with quick actions
2. Browse Services
   - Tab: Transportation
   - Tab: Residences
3. Service Details
4. Search & Filters
5. My Contracts
6. Messages
7. Review Service

#### Provider Screens
1. Dashboard - Analytics overview
2. My Listings - Service management
3. Add/Edit Service
4. Bookings - Active contracts
5. Messages
6. Analytics

## Development Phases

### Phase 1: Foundation & Core Discovery ✅ (Current)
**Goal**: Basic multi-role system with service discovery

**Features**:
- ✅ Multi-role authentication
- ✅ Student: Browse and search services
- ✅ Provider: Create and manage listings
- ✅ Advanced filtering (price, location, rating)
- ✅ Service details with images
- ✅ Basic reviews and ratings
- ✅ Mobile-first navigation

**Deliverables**:
- Working authentication for all roles
- Service listings CRUD
- Search and filter functionality
- Basic profile management
- Mobile apps for both roles

### Phase 2: Contracting & Payments
**Goal**: Digital contracts and payment automation

**Features**:
- Auto-generated contracts
- Digital signing workflow
- Mock payment system
- Payment scheduling
- Invoice generation
- Revenue split logic (90/10)

### Phase 3: Real-time Communication & Safety
**Goal**: Secure in-app messaging with monitoring

**Features**:
- Socket.IO real-time chat
- Identity masking
- AI-powered abuse detection
- One-tap reporting
- Chat moderation dashboard
- Incident tracking

### Phase 4: GPS & Transportation Intelligence
**Goal**: Real-time tracking and route optimization

**Features**:
- Google Maps integration
- Live vehicle tracking
- Route optimization with AI
- ETA notifications
- Emergency alert button
- Geofencing

### Phase 5: AI Features & Admin Console
**Goal**: Intelligence layer and platform management

**Features**:
- AI route scheduling
- Demand forecasting
- Provider reliability scoring
- Admin dashboard
- Platform analytics
- Compliance reporting

## Security & Safety Framework

### Data Protection
1. **No Phone Number Exposure** - Always masked in UI
2. **Encrypted Storage** - Sensitive data encrypted at rest
3. **JWT Authentication** - Secure token-based auth
4. **Role-based Access Control** - Strict permissions

### Safety Features
1. **Identity Verification** - Document upload for providers
2. **Safety Scores** - Algorithm-based user ratings
3. **Audit Trail** - Full interaction logging
4. **Reporting System** - One-tap incident reporting
5. **Content Moderation** - AI-powered chat monitoring

## UI/UX Guidelines

### Design Principles
1. **Mobile-First** - Thumb-friendly, touch-optimized
2. **Safety-First** - Clear trust indicators
3. **Contextual** - Task-focused flows
4. **Accessible** - WCAG compliance
5. **Performant** - <2s load times

### Color Scheme
- Primary: Trust blue (#2563EB)
- Secondary: Safety green (#10B981)
- Accent: Highlight orange (#F59E0B)
- Danger: Alert red (#EF4444)
- Background: Clean white/light gray

### Typography
- Headings: Bold, clear hierarchy
- Body: Readable, 16px minimum
- Labels: 14px, medium weight

## Performance Targets
- App launch: < 2 seconds
- API response: < 500ms
- Image load: Progressive, optimized
- Offline: Basic browsing with cache
- Concurrent users: 10,000+

## Testing Strategy
1. **Unit Tests** - Individual functions
2. **Integration Tests** - API endpoints
3. **E2E Tests** - Complete user flows
4. **Performance Tests** - Load testing
5. **Security Tests** - Penetration testing
6. **Usability Tests** - User feedback

## Deployment Strategy
1. **Development** - Local testing
2. **Staging** - Pre-production testing
3. **Production** - Gradual rollout
4. **Monitoring** - Real-time alerts
5. **Rollback** - Quick reversion capability

---

**Document Version**: 1.0  
**Last Updated**: Phase 1 Implementation  
**Status**: In Development
