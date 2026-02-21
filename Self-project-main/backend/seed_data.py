import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv
from auth import hash_password

load_dotenv()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_data():
    print("🌱 Starting to seed Muyassir database...")
    
    # Clear existing data
    print("📦 Clearing existing data...")
    #await db.users.delete_many({})
    #await db.services.delete_many({})
    #await db.reviews.delete_many({})
    
    # Create users
    print("👥 Creating users...")
    
    # Clients (formerly students)
    student1_id = ObjectId()
    student2_id = ObjectId()
    student3_id = ObjectId()
    
    students = [
        {
            "_id": student1_id,
            "email": "sarah@example.com",
            "password_hash": hash_password("password123"),
            "role": "client",
            "profile": {
                "full_name": "Sarah Al-Balushi",
                "university": "Sultan Qaboos University",
                "student_id": "SQU2023001",
                "client_type": "student",
                "verification_status": "verified",
                "verification_documents": [],
                "verification_rejected_reason": None,
                "created_at": datetime.utcnow()
            },
            "safety_score": 100.0,
            "is_active": True,
            "is_banned": False
        },
        {
            "_id": student2_id,
            "email": "fatima@example.com",
            "password_hash": hash_password("password123"),
            "role": "client",
            "profile": {
                "full_name": "Fatima Al-Hinai",
                "university": "University of Technology and Applied Sciences",
                "student_id": "UTAS2023045",
                "client_type": "student",
                "verification_status": "verified",
                "verification_documents": [],
                "verification_rejected_reason": None,
                "created_at": datetime.utcnow()
            },
            "safety_score": 98.5,
            "is_active": True,
            "is_banned": False
        },
        {
            "_id": student3_id,
            "email": "layla@example.com",
            "password_hash": hash_password("password123"),
            "role": "client",
            "profile": {
                "full_name": "Layla Al-Lawati",
                "university": "Sultan Qaboos University",
                "student_id": "SQU2023089",
                "client_type": "student",
                "verification_status": "pending",
                "verification_documents": [],
                "verification_rejected_reason": None,
                "created_at": datetime.utcnow()
            },
            "safety_score": 100.0,
            "is_active": True,
            "is_banned": False
        }
    ]
    
    # Service Providers
    provider1_id = ObjectId()
    provider2_id = ObjectId()
    provider3_id = ObjectId()
    
    # Admin user
    admin_id = ObjectId()
    admin_user = {
        "_id": admin_id,
        "email": "admin@muyassir.com",
        "password_hash": hash_password("admin123"),
        "role": "admin",
        "profile": {
            "full_name": "System Administrator",
            "verification_status": "verified",
            "verification_documents": [],
            "verification_rejected_reason": None,
            "created_at": datetime.utcnow()
        },
        "safety_score": 100.0,
        "is_active": True,
        "is_banned": False
    }
    
    providers = [
        {
            "_id": provider1_id,
            "email": "safetransport@example.com",
            "password_hash": hash_password("password123"),
            "role": "service_provider",
            "profile": {
                "full_name": "Safe Transport Services",
                "phone_masked": "***-***-5678",
                "verification_status": "verified",
                "verification_documents": [],
                "verification_rejected_reason": None,
                "created_at": datetime.utcnow()
            },
            "safety_score": 95.5,
            "is_active": True,
            "is_banned": False
        },
        {
            "_id": provider2_id,
            "email": "comfort.residence@example.com",
            "password_hash": hash_password("password123"),
            "role": "service_provider",
            "profile": {
                "full_name": "Comfort Student Residences",
                "phone_masked": "***-***-1234",
                "verification_status": "verified",
                "verification_documents": [],
                "verification_rejected_reason": None,
                "created_at": datetime.utcnow()
            },
            "safety_score": 97.0,
            "is_active": True,
            "is_banned": False
        },
        {
            "_id": provider3_id,
            "email": "campus.shuttle@example.com",
            "password_hash": hash_password("password123"),
            "role": "service_provider",
            "profile": {
                "full_name": "Campus Shuttle Express",
                "phone_masked": "***-***-9876",
                "verification_status": "pending",
                "verification_documents": [],
                "verification_rejected_reason": None,
                "created_at": datetime.utcnow()
            },
            "safety_score": 92.0,
            "is_active": True,
            "is_banned": False
        }
    ]
    
    await db.users.insert_many(students + providers + [admin_user])
    print(f"✅ Created {len(students)} clients, {len(providers)} providers, and 1 admin")
    
    # Create services
    print("🚗 Creating services...")
    
    # Transportation Services
    transport1_id = ObjectId()
    transport2_id = ObjectId()
    transport3_id = ObjectId()
    
    transports = [
        {
            "_id": transport1_id,
            "provider_id": provider1_id,
            "service_type": "transportation",
            "title": "Daily University Shuttle - Sultan Qaboos University",
            "description": "Safe and comfortable daily shuttle service for female students. Air-conditioned buses with female drivers. Door-to-door pickup service with GPS tracking.",
            "images": [],
            "price_monthly": 35.0,
            "capacity": 25,
            "available_slots": 8,
            "location": {
                "address": "Muscat, Al Khuwair",
                "coordinates": {"lat": 23.5880, "lng": 58.3829},
                "city": "Muscat",
                "university_nearby": "Sultan Qaboos University"
            },
            "transportation": {
                "vehicle_type": "Air-conditioned Bus",
                "vehicle_number": "MSC-5432",
                "route": [
                    {"point": "Al Khuwair", "time": "06:30 AM"},
                    {"point": "Sultan Qaboos University", "time": "07:15 AM"},
                    {"point": "Return - Sultan Qaboos University", "time": "02:00 PM"},
                    {"point": "Return - Al Khuwair", "time": "02:45 PM"}
                ],
                "pickup_times": ["06:30 AM", "02:00 PM"],
                "amenities": ["Air Conditioning", "WiFi", "GPS Tracking", "Female Driver", "CCTV Camera"]
            },
            "rating": {"average": 4.8, "count": 42},
            "safety_score": 96.0,
            "status": "active",
            "auto_accept": True,  # Auto-accept enabled for testing
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": transport2_id,
            "provider_id": provider3_id,
            "service_type": "transportation",
            "title": "Express Campus Shuttle - UTAS Muscat",
            "description": "Premium shuttle service exclusively for female students. Multiple daily trips with flexible timings. Professional female drivers with excellent safety records.",
            "images": [],
            "price_monthly": 40.0,
            "capacity": 30,
            "available_slots": 12,
            "location": {
                "address": "Muscat, Al Hail",
                "coordinates": {"lat": 23.5922, "lng": 58.3815},
                "city": "Muscat",
                "university_nearby": "University of Technology and Applied Sciences"
            },
            "transportation": {
                "vehicle_type": "Luxury Van",
                "vehicle_number": "MSC-7890",
                "route": [
                    {"point": "Al Hail", "time": "07:00 AM"},
                    {"point": "UTAS Muscat", "time": "07:45 AM"},
                    {"point": "Return - UTAS Muscat", "time": "03:30 PM"},
                    {"point": "Return - Al Hail", "time": "04:15 PM"}
                ],
                "pickup_times": ["07:00 AM", "03:30 PM"],
                "amenities": ["Luxury Seating", "Air Conditioning", "WiFi", "GPS Tracking", "Female Driver", "Phone Charging"]
            },
            "rating": {"average": 4.6, "count": 28},
            "safety_score": 93.0,
            "status": "active",
            "auto_accept": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": transport3_id,
            "provider_id": provider1_id,
            "service_type": "transportation",
            "title": "Evening Classes Shuttle - SQU",
            "description": "Specialized shuttle for evening and weekend classes. Safe transport with security features. Perfect for graduate students and working professionals.",
            "images": [],
            "price_monthly": 30.0,
            "capacity": 20,
            "available_slots": 15,
            "location": {
                "address": "Muscat, Qurum",
                "coordinates": {"lat": 23.5938, "lng": 58.4115},
                "city": "Muscat",
                "university_nearby": "Sultan Qaboos University"
            },
            "transportation": {
                "vehicle_type": "Mini Bus",
                "vehicle_number": "MSC-3456",
                "route": [
                    {"point": "Qurum", "time": "04:00 PM"},
                    {"point": "Sultan Qaboos University", "time": "04:45 PM"},
                    {"point": "Return - Sultan Qaboos University", "time": "09:00 PM"},
                    {"point": "Return - Qurum", "time": "09:45 PM"}
                ],
                "pickup_times": ["04:00 PM", "09:00 PM"],
                "amenities": ["Air Conditioning", "GPS Tracking", "Female Driver", "Emergency Button"]
            },
            "rating": {"average": 4.5, "count": 19},
            "safety_score": 94.5,
            "status": "active",
            "auto_accept": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Residence Services
    residence1_id = ObjectId()
    residence2_id = ObjectId()
    residence3_id = ObjectId()
    
    residences = [
        {
            "_id": residence1_id,
            "provider_id": provider2_id,
            "service_type": "residence",
            "title": "Comfort Student Apartments - Near SQU",
            "description": "Fully furnished apartments for female students. 24/7 security with female security staff. Close to Sultan Qaboos University campus. All utilities included.",
            "images": [],
            "price_monthly": 150.0,
            "capacity": 12,
            "available_slots": 3,
            "location": {
                "address": "Al Khoudh, near SQU Main Gate",
                "coordinates": {"lat": 23.5897, "lng": 58.1675},
                "city": "Muscat",
                "university_nearby": "Sultan Qaboos University"
            },
            "residence": {
                "residence_type": "apartment",
                "bedrooms": 2,
                "bathrooms": 2,
                "furnished": True,
                "amenities": ["WiFi", "Air Conditioning", "Kitchen", "Laundry", "24/7 Security", "Parking", "Study Room", "Female Staff"],
                "gender_restriction": "female",
                "lease_duration_months": 12
            },
            "rating": {"average": 4.9, "count": 35},
            "safety_score": 98.0,
            "status": "active",
            "auto_accept": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": residence2_id,
            "provider_id": provider2_id,
            "service_type": "residence",
            "title": "Shared Student Rooms - Al Hail",
            "description": "Budget-friendly shared rooms for female students. Walking distance to UTAS. Includes meals and housekeeping.",
            "images": [],
            "price_monthly": 80.0,
            "capacity": 24,
            "available_slots": 7,
            "location": {
                "address": "Al Hail North, Muscat",
                "coordinates": {"lat": 23.6017, "lng": 58.3921},
                "city": "Muscat",
                "university_nearby": "University of Technology and Applied Sciences"
            },
            "residence": {
                "residence_type": "shared",
                "bedrooms": 1,
                "bathrooms": 1,
                "furnished": True,
                "amenities": ["WiFi", "Air Conditioning", "Meals Included", "Housekeeping", "Security", "Common Kitchen", "Study Lounge"],
                "gender_restriction": "female",
                "lease_duration_months": 6
            },
            "rating": {"average": 4.4, "count": 52},
            "safety_score": 95.0,
            "status": "active",
            "auto_accept": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": residence3_id,
            "provider_id": provider2_id,
            "service_type": "residence",
            "title": "Premium Studio Apartments - Qurum",
            "description": "Luxury studio apartments perfect for graduate students. Modern amenities, gym access, and study spaces. Professional management with 24/7 concierge.",
            "images": [],
            "price_monthly": 200.0,
            "capacity": 8,
            "available_slots": 2,
            "location": {
                "address": "Qurum Beach Road, Muscat",
                "coordinates": {"lat": 23.5975, "lng": 58.4692},
                "city": "Muscat",
                "university_nearby": "Sultan Qaboos University"
            },
            "residence": {
                "residence_type": "apartment",
                "bedrooms": 1,
                "bathrooms": 1,
                "furnished": True,
                "amenities": ["WiFi", "Air Conditioning", "Gym", "Pool", "Parking", "24/7 Concierge", "Study Room", "Kitchen", "Laundry"],
                "gender_restriction": "any",
                "lease_duration_months": 12
            },
            "rating": {"average": 4.7, "count": 18},
            "safety_score": 96.5,
            "status": "active",
            "auto_accept": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db.services.insert_many(transports + residences)
    print(f"✅ Created {len(transports)} transportation and {len(residences)} residence services")
    
    # Create reviews
    print("⭐ Creating reviews...")
    
    reviews = [
        {
            "service_id": transport1_id,
            "student_id": student1_id,
            "rating": 5,
            "review_text": "Excellent service! The driver is always on time and very professional. I feel safe and comfortable throughout my journey.",
            "safety_rating": 5,
            "categories": {
                "punctuality": 5,
                "cleanliness": 5,
                "communication": 5,
                "value_for_money": 4
            },
            "verified_booking": True,
            "created_at": datetime.utcnow()
        },
        {
            "service_id": transport1_id,
            "student_id": student2_id,
            "rating": 4,
            "review_text": "Great shuttle service. WiFi is a nice touch. Sometimes gets a bit crowded during peak hours.",
            "safety_rating": 5,
            "categories": {
                "punctuality": 5,
                "cleanliness": 4,
                "communication": 4,
                "value_for_money": 4
            },
            "verified_booking": True,
            "created_at": datetime.utcnow()
        },
        {
            "service_id": residence1_id,
            "student_id": student3_id,
            "rating": 5,
            "review_text": "Best decision I made for my studies! The apartment is clean, safe, and close to campus. Management is very responsive.",
            "safety_rating": 5,
            "categories": {
                "punctuality": 5,
                "cleanliness": 5,
                "communication": 5,
                "value_for_money": 5
            },
            "verified_booking": True,
            "created_at": datetime.utcnow()
        },
        {
            "service_id": residence2_id,
            "student_id": student1_id,
            "rating": 4,
            "review_text": "Good value for money. The shared room is comfortable and my roommates are friendly. Meals are decent.",
            "safety_rating": 5,
            "categories": {
                "punctuality": 4,
                "cleanliness": 4,
                "communication": 4,
                "value_for_money": 5
            },
            "verified_booking": True,
            "created_at": datetime.utcnow()
        },
        {
            "service_id": transport2_id,
            "student_id": student3_id,
            "rating": 5,
            "review_text": "Love the luxury vans! Very comfortable for my daily commute. The driver is friendly and professional.",
            "safety_rating": 5,
            "categories": {
                "punctuality": 5,
                "cleanliness": 5,
                "communication": 5,
                "value_for_money": 4
            },
            "verified_booking": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.reviews.insert_many(reviews)
    print(f"✅ Created {len(reviews)} reviews")
    
    # Summary
    print("\n" + "="*50)
    print("🎉 Database seeded successfully!")
    print("="*50)
    print(f"\n📊 Summary:")
    print(f"   👥 Users: {len(students)} students, {len(providers)} providers")
    print(f"   🚗 Transportation services: {len(transports)}")
    print(f"   🏠 Residence services: {len(residences)}")
    print(f"   ⭐ Reviews: {len(reviews)}")
    print("\n🔐 Test Credentials:")
    print("   Students:")
    print("     - sarah@example.com / password123")
    print("     - fatima@example.com / password123")
    print("     - layla@example.com / password123")
    print("   Providers:")
    print("     - safetransport@example.com / password123")
    print("     - comfort.residence@example.com / password123")
    print("     - campus.shuttle@example.com / password123")
    print("\n✅ Ready to test!")

if __name__ == "__main__":
    asyncio.run(seed_data())
