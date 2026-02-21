from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional
import uuid

def generate_contract_terms(service: dict, provider: dict, student: dict, duration_months: int, start_date) -> str:
    """Generate auto-contract terms based on service type"""
    
    service_type = service['service_type']
    end_date = start_date + relativedelta(months=duration_months)
    monthly_price = service['price_monthly']
    total_amount = monthly_price * duration_months
    
    # Generate payment schedule
    payment_schedule = []
    current_date = start_date
    for i in range(duration_months):
        payment_schedule.append(f"- {current_date.strftime('%b %d, %Y')}: {monthly_price} OMR")
        current_date = current_date + relativedelta(months=1)
    
    if service_type == 'transportation':
        # Transportation contract
        route_info = "\n".join([f"  • {rp['point']} at {rp['time']}" for rp in service.get('transportation', {}).get('route', [])])
        amenities = ", ".join(service.get('transportation', {}).get('amenities', []))
        
        terms = f"""STUDENT TRANSPORTATION SERVICE AGREEMENT

This agreement is made on {datetime.utcnow().strftime('%B %d, %Y')} between:

STUDENT: {student['profile']['full_name']}
University: {student['profile'].get('university', 'N/A')}
Student ID: {student['profile'].get('student_id', 'N/A')}

SERVICE PROVIDER: {provider['profile']['full_name']}
Safety Score: {provider.get('safety_score', 0)}%

SERVICE: {service['title']}
Location: {service['location']['city']}, Oman

═══════════════════════════════════════════════════════════

1. CONTRACT DURATION
   Start Date: {start_date.strftime('%B %d, %Y')}
   End Date: {end_date.strftime('%B %d, %Y')}
   Duration: {duration_months} months

2. PAYMENT TERMS
   Monthly Fee: {monthly_price} OMR
   Total Amount: {total_amount} OMR
   Payment Due: 1st of each month

3. SERVICE DETAILS
   Vehicle Type: {service.get('transportation', {}).get('vehicle_type', 'N/A')}
   Vehicle Number: {service.get('transportation', {}).get('vehicle_number', 'N/A')}
   
   Route:
{route_info}
   
   Amenities: {amenities}

4. PAYMENT SCHEDULE
{chr(10).join(payment_schedule)}

5. SAFETY & SECURITY
   • No personal contact details will be shared
   • GPS tracking enabled for all trips
   • Emergency contact available 24/7
   • Female driver for female students
   • All communications through Muyassir platform only
   • Provider verified and background checked

6. CANCELLATION POLICY
   • 7-day written notice required for cancellation
   • Refunds processed within 14 business days
   • Pro-rated refunds for unused months
   • Emergency cancellations handled case-by-case

7. OBLIGATIONS
   Student Agrees To:
   • Be ready at designated pickup time
   • Follow safety guidelines
   • Make timely monthly payments
   • Report any issues immediately

   Provider Agrees To:
   • Maintain vehicle in good condition
   • Arrive on time for all pickups
   • Ensure student safety at all times
   • Follow all route schedules

8. DISPUTE RESOLUTION
   • All disputes handled through Muyassir platform
   • Mediation available at no cost
   • Platform decision is final and binding

9. EMERGENCY CONTACTS
   Muyassir Support: Available 24/7 through app
   Emergency: Contact through in-app emergency button

═══════════════════════════════════════════════════════════

By signing this agreement, both parties acknowledge they have read, 
understood, and agree to abide by all terms and conditions stated above.

This is a legally binding digital contract.
Platform: Muyassir (مُيسر) - Safe Student Services
"""
    else:
        # Residence contract
        residence_type = service.get('residence', {}).get('residence_type', 'N/A')
        bedrooms = service.get('residence', {}).get('bedrooms', 0)
        bathrooms = service.get('residence', {}).get('bathrooms', 0)
        furnished = "Yes" if service.get('residence', {}).get('furnished', False) else "No"
        amenities = ", ".join(service.get('residence', {}).get('amenities', []))
        gender = service.get('residence', {}).get('gender_restriction', 'any')
        
        terms = f"""STUDENT RESIDENCE RENTAL AGREEMENT

This agreement is made on {datetime.utcnow().strftime('%B %d, %Y')} between:

STUDENT: {student['profile']['full_name']}
University: {student['profile'].get('university', 'N/A')}
Student ID: {student['profile'].get('student_id', 'N/A')}

PROPERTY OWNER: {provider['profile']['full_name']}
Safety Score: {provider.get('safety_score', 0)}%

PROPERTY: {service['title']}
Location: {service['location']['address']}, {service['location']['city']}, Oman

═══════════════════════════════════════════════════════════

1. LEASE DURATION
   Start Date: {start_date.strftime('%B %d, %Y')}
   End Date: {end_date.strftime('%B %d, %Y')}
   Duration: {duration_months} months

2. RENT & PAYMENT
   Monthly Rent: {monthly_price} OMR
   Total Amount: {total_amount} OMR
   Payment Due: 1st of each month
   Late Fee: 5 OMR after 5 days

3. PROPERTY DETAILS
   Type: {residence_type.title()}
   Bedrooms: {bedrooms}
   Bathrooms: {bathrooms}
   Furnished: {furnished}
   Gender Restriction: {gender.title()}
   
   Included Amenities: {amenities}

4. PAYMENT SCHEDULE
{chr(10).join(payment_schedule)}

5. UTILITIES & SERVICES
   Included in Rent:
   • Water and electricity (normal usage)
   • Internet WiFi
   • Building maintenance
   • Security services
   
   Not Included:
   • Excessive utility usage
   • Personal items
   • Optional services

6. SECURITY & SAFETY
   • 24/7 security staff (female staff for female residences)
   • CCTV monitoring in common areas
   • Secure entry systems
   • Emergency contact available
   • No personal contact details shared
   • All communications through Muyassir platform

7. TENANT RESPONSIBILITIES
   • Keep property clean and in good condition
   • Report maintenance issues promptly
   • No unauthorized modifications
   • Respect quiet hours (10 PM - 7 AM)
   • No subletting without written permission
   • Follow building rules and regulations

8. OWNER RESPONSIBILITIES
   • Maintain property in habitable condition
   • Address maintenance within 48 hours
   • Provide functional utilities
   • Ensure security measures
   • Respect tenant privacy

9. INSPECTION & MAINTENANCE
   • Move-in inspection within 24 hours
   • Routine inspections with 24-hour notice
   • Emergency repairs without notice
   • Move-out inspection on last day

10. TERMINATION & RENEWAL
    • 30-day written notice required
    • Security deposit returned within 14 days
    • Renewal option available 60 days before end
    • Early termination fees may apply

11. DISPUTE RESOLUTION
    • All disputes handled through Muyassir
    • Mediation available at no cost
    • Platform decision is final

═══════════════════════════════════════════════════════════

By signing this agreement, both parties acknowledge they have read,
understood, and agree to abide by all terms and conditions stated above.

This is a legally binding digital contract.
Platform: Muyassir (مُيسر) - Safe Student Services
"""
    
    return terms

def generate_payment_schedule(start_date, duration_months: int, monthly_price: float):
    """Generate payment schedule for contract"""
    schedule = []
    current_date = start_date
    
    for i in range(duration_months):
        # Convert date to datetime for MongoDB compatibility
        due_datetime = datetime.combine(current_date, datetime.min.time()) if hasattr(current_date, 'day') else current_date
        schedule.append({
            "due_date": due_datetime,
            "amount": monthly_price,
            "status": "pending",
            "paid_at": None,
            "transaction_id": None
        })
        current_date = current_date + relativedelta(months=1)
    
    return schedule

def generate_transaction_id() -> str:
    """Generate unique transaction ID"""
    return f"MYS-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

def calculate_revenue_split(amount: float):
    """Calculate 90/10 revenue split"""
    provider_amount = round(amount * 0.90, 2)
    platform_fee = round(amount * 0.10, 2)
    
    # Adjust for rounding to ensure total matches
    if provider_amount + platform_fee != amount:
        provider_amount = amount - platform_fee
    
    return {
        "provider_amount": provider_amount,
        "platform_fee": platform_fee
    }
