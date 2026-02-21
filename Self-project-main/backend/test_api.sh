#!/bin/bash

echo "🧪 Testing Muyassir Backend API"
echo "================================"
echo ""

BASE_URL="http://localhost:8001/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        if [ -z "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" "$BASE_URL$endpoint")
        fi
    elif [ "$method" = "POST" ]; then
        if [ -z "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data" "$BASE_URL$endpoint")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "Response: $body"
        ((FAILED++))
    fi
    echo ""
}

# 1. Health Check
echo "=== 1. Health Check ==="
test_endpoint "Health Check" "GET" "/health"

# 2. Register Student
echo "=== 2. Authentication Tests ==="
echo "Testing: Register New Student"
register_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "email": "test.student@example.com",
    "password": "testpass123",
    "role": "student",
    "full_name": "Test Student",
    "university": "Test University",
    "student_id": "TEST001"
  }' \
  "$BASE_URL/auth/register")

student_token=$(echo $register_response | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$student_token" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Student registered successfully"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Student registration failed"
    ((FAILED++))
fi
echo ""

# 3. Login Student
echo "Testing: Login Student"
login_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "password123"
  }' \
  "$BASE_URL/auth/login")

student_token=$(echo $login_response | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$student_token" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Student login successful"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Student login failed"
    ((FAILED++))
fi
echo ""

# 4. Login Provider
echo "Testing: Login Provider"
provider_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "email": "safetransport@example.com",
    "password": "password123"
  }' \
  "$BASE_URL/auth/login")

provider_token=$(echo $provider_response | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$provider_token" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Provider login successful"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Provider login failed"
    ((FAILED++))
fi
echo ""

# 5. Get Current User
test_endpoint "Get Current User (Student)" "GET" "/auth/me" "" "$student_token"

# 6. List All Services
echo "=== 3. Service Discovery Tests ==="
test_endpoint "List All Services" "GET" "/services"

# 7. List Transportation Services
test_endpoint "List Transportation Services" "GET" "/services?service_type=transportation"

# 8. List Residence Services
test_endpoint "List Residence Services" "GET" "/services?service_type=residence"

# 9. Filter by Price
test_endpoint "Filter by Price Range" "GET" "/services?min_price=400&max_price=600"

# 10. Filter by City
test_endpoint "Filter by City" "GET" "/services?city=Riyadh"

# 11. Filter by University
test_endpoint "Filter by University" "GET" "/services?university=King%20Saud"

# 12. Filter by Rating
test_endpoint "Filter by Rating" "GET" "/services?min_rating=4.5"

# 13. Advanced Search
echo "Testing: Advanced Search"
search_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "service_type": "transportation",
    "min_price": 300,
    "max_price": 500,
    "city": "Riyadh",
    "min_rating": 4.0,
    "skip": 0,
    "limit": 10
  }' \
  "$BASE_URL/services/search")

if echo "$search_response" | grep -q "title"; then
    echo -e "${GREEN}✓ PASSED${NC} - Advanced search working"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Advanced search failed"
    ((FAILED++))
fi
echo ""

# 14. Get Specific Service
echo "Testing: Get Service Details"
service_id=$(curl -s "$BASE_URL/services" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$service_id" ]; then
    test_endpoint "Get Service by ID" "GET" "/services/$service_id"
else
    echo -e "${RED}✗ FAILED${NC} - Could not get service ID"
    ((FAILED++))
    echo ""
fi

# 15. Get Provider's Listings
echo "=== 4. Provider Management Tests ==="
test_endpoint "Get Provider's Listings" "GET" "/services/provider/my-listings" "" "$provider_token"

# 16. Create Service (Provider)
echo "Testing: Create New Service"
create_service=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $provider_token" \
  -d '{
    "service_type": "transportation",
    "title": "Test Shuttle Service",
    "description": "A test shuttle for API testing",
    "images": [],
    "price_monthly": 400,
    "capacity": 20,
    "location": {
      "address": "Test Address",
      "coordinates": {"lat": 24.7, "lng": 46.7},
      "city": "Riyadh",
      "university_nearby": "Test University"
    },
    "transportation": {
      "vehicle_type": "Bus",
      "vehicle_number": "TEST-123",
      "route": [{"point": "Start", "time": "08:00 AM"}],
      "pickup_times": ["08:00 AM"],
      "amenities": ["WiFi", "AC"]
    }
  }' \
  "$BASE_URL/services")

http_code=$(echo "$create_service" | tail -n1)
new_service_id=$(echo "$create_service" | sed '$d' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ "$http_code" = "201" ] && [ -n "$new_service_id" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Service created (HTTP $http_code)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Service creation failed (HTTP $http_code)"
    ((FAILED++))
fi
echo ""

# 17. Update Service
if [ -n "$new_service_id" ]; then
    echo "Testing: Update Service"
    update_response=$(curl -s -w "\n%{http_code}" -X PUT \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $provider_token" \
      -d '{"title": "Updated Test Shuttle", "price_monthly": 450}' \
      "$BASE_URL/services/$new_service_id")
    
    http_code=$(echo "$update_response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Service updated (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Service update failed (HTTP $http_code)"
        ((FAILED++))
    fi
    echo ""
fi

# 18. Get Reviews for Service
echo "=== 5. Review System Tests ==="
if [ -n "$service_id" ]; then
    test_endpoint "Get Service Reviews" "GET" "/reviews/service/$service_id"
fi

# 19. Create Review (Student)
if [ -n "$service_id" ]; then
    echo "Testing: Create Review"
    review_response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $student_token" \
      -d "{
        \"service_id\": \"$service_id\",
        \"rating\": 5,
        \"review_text\": \"Excellent service! Very professional and safe.\",
        \"safety_rating\": 5,
        \"categories\": {
          \"punctuality\": 5,
          \"cleanliness\": 5,
          \"communication\": 5,
          \"value_for_money\": 5
        }
      }" \
      "$BASE_URL/reviews")
    
    http_code=$(echo "$review_response" | tail -n1)
    
    if [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Review created (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Review creation failed (HTTP $http_code)"
        ((FAILED++))
    fi
    echo ""
fi

# 20. Delete Service
if [ -n "$new_service_id" ]; then
    echo "Testing: Delete Service"
    delete_response=$(curl -s -w "\n%{http_code}" -X DELETE \
      -H "Authorization: Bearer $provider_token" \
      "$BASE_URL/services/$new_service_id")
    
    http_code=$(echo "$delete_response" | tail -n1)
    
    if [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Service deleted (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Service deletion failed (HTTP $http_code)"
        ((FAILED++))
    fi
    echo ""
fi

# Summary
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
