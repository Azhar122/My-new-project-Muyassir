# Phase 2: Contracting & Payments - Implementation Plan

## Overview
Build complete digital contract and payment system with 90/10 revenue split model.

## Backend Implementation

### 1. Contract APIs (8 endpoints)
- POST /api/contracts - Create contract (student)
- GET /api/contracts - List all contracts (filtered by role)
- GET /api/contracts/{id} - Get contract details
- POST /api/contracts/{id}/sign - Sign contract (student or provider)
- PUT /api/contracts/{id}/cancel - Cancel contract
- GET /api/contracts/student/my-contracts - Student's contracts
- GET /api/contracts/provider/my-contracts - Provider's contracts
- GET /api/contracts/{id}/invoice - Generate invoice

### 2. Payment APIs (5 endpoints)
- POST /api/payments - Make payment (student)
- GET /api/payments/{id} - Get payment details
- GET /api/payments/contract/{contract_id} - Get contract payments
- POST /api/payments/mock - Process mock payment
- GET /api/payments/provider/earnings - Provider earnings dashboard

### 3. Contract Generation Logic
- Auto-generate terms based on service type
- Calculate payment schedule (monthly)
- Set start/end dates
- Include safety clauses
- Bilingual support (EN/AR)

### 4. Payment Processing
- Mock payment gateway
- 90% to provider
- 10% platform fee
- Transaction ID generation
- Payment verification

## Frontend Implementation

### 1. Student Screens (4 new screens)
- Service booking screen (initiate contract)
- My Contracts list
- Contract details & signing
- Payment screen

### 2. Provider Screens (3 new screens)
- Contract requests
- Contract management
- Earnings dashboard

### 3. Components
- ContractCard
- PaymentHistory
- SignatureButton
- InvoiceView

## Database Collections

### Contracts Collection
```javascript
{
  _id: ObjectId,
  student_id: ObjectId,
  provider_id: ObjectId,
  service_id: ObjectId,
  start_date: Date,
  end_date: Date,
  monthly_price: Number,
  duration_months: Number,
  total_amount: Number,
  auto_generated_terms: String,
  student_signature: {
    signed: Boolean,
    signed_at: Date,
    ip_address: String
  },
  provider_signature: {
    signed: Boolean,
    signed_at: Date,
    ip_address: String
  },
  payment_schedule: [{
    due_date: Date,
    amount: Number,
    status: String,
    paid_at: Date,
    transaction_id: String
  }],
  status: String,
  created_at: Date,
  updated_at: Date
}
```

### Payments Collection
```javascript
{
  _id: ObjectId,
  contract_id: ObjectId,
  student_id: ObjectId,
  provider_id: ObjectId,
  amount: Number,
  provider_amount: Number, // 90%
  platform_fee: Number, // 10%
  payment_method: String,
  transaction_id: String,
  status: String,
  paid_at: Date,
  created_at: Date
}
```

## Revenue Split Model

**90/10 Split:**
- Student pays: 35 OMR
- Provider receives: 31.5 OMR (90%)
- Platform keeps: 3.5 OMR (10%)

## Contract Terms Template

### Transportation Contract (English)
```
STUDENT TRANSPORTATION SERVICE AGREEMENT

This agreement is made between:
- Student: {student_name}
- Service Provider: {provider_name}
- Service: {service_title}

TERMS:
1. Duration: {duration_months} months ({start_date} to {end_date})
2. Monthly Fee: {monthly_price} OMR
3. Total Amount: {total_amount} OMR

SERVICE DETAILS:
- Route: {route_points}
- Pickup Times: {pickup_times}
- Vehicle: {vehicle_type}

PAYMENT SCHEDULE:
{monthly_payments}

SAFETY & CANCELLATION:
- No personal contact details shared
- 7-day cancellation notice required
- Refunds processed within 14 days
- Emergency contact: Muyassir Support

By signing, both parties agree to these terms.
```

### Residence Contract (Arabic Support)
Similar template with residence-specific terms.

## Testing Plan

1. Create contract (student books service)
2. Provider signs contract
3. Student signs contract
4. Contract becomes active
5. Student makes payment
6. Payment splits 90/10
7. Invoice generated
8. Payment recorded in schedule

## Success Criteria

- ✅ Contracts auto-generated correctly
- ✅ Both parties can sign digitally
- ✅ Payments process with 90/10 split
- ✅ Payment schedule tracked
- ✅ Invoices generated
- ✅ Provider earnings dashboard functional
- ✅ Mock payment system works
- ✅ Contract cancellation functional

## Implementation Order

1. Backend models ✅ (DONE)
2. Contract APIs
3. Payment APIs  
4. Frontend types
5. Contract screens (student)
6. Contract screens (provider)
7. Payment screens
8. Testing
9. Documentation

---

**Status**: Models created, ready for API implementation
**Next**: Create contract and payment API endpoints
