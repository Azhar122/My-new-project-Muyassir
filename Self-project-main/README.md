# Muyassir - Student Services Platform

A production-ready, safety-first student transportation and residence contracting platform built with Expo (React Native) and FastAPI.

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB (running locally on port 27017)
- Yarn (`npm install -g yarn`)
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup
```bash
cd /app/backend

# Create environment file
Copy-Item .env.example .env
# Edit .env if needed (defaults work for local dev)

# Install dependencies
pip install -r requirements.txt

# Seed sample data (optional)
python seed_data.py

# Start server (runs on port 8001)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd /app/frontend

# Create environment file
Copy-Item .env.example .env
# Edit .env if needed (defaults work for local dev)

# Install dependencies
yarn install

# Start Expo development server
expo start
```

### Verify Setup
- Backend health: http://localhost:8001/api/health
- Frontend web: http://localhost:3000 (after expo start)

---

## 🏗️ Architecture Overview

```
/app
├── backend/                 # FastAPI Python Backend
│   ├── server.py           # Main API server (all endpoints)
│   ├── models.py           # Pydantic models & database schemas
│   ├── contracts.py        # Contract business logic
│   ├── auth.py             # JWT authentication helpers
│   └── seed_data.py        # Database seeding script
│
└── frontend/               # Expo React Native App
    ├── app/                # File-based routing (expo-router)
    │   ├── (auth)/         # Auth screens (login, register)
    │   ├── (student)/      # Student role screens
    │   └── (provider)/     # Service provider screens
    ├── components/         # Reusable UI components
    ├── contexts/           # React contexts (Auth, Language)
    ├── services/           # API service functions
    ├── types/              # TypeScript type definitions
    └── locales/            # i18n translations (EN/AR)
```

## 📱 Building for Mobile

### Android APK/AAB
```bash
cd /app/frontend
eas build --platform android --profile preview  # APK
eas build --platform android --profile production  # AAB for Play Store
```

### iOS IPA
```bash
eas build --platform ios --profile production
```

## 🔐 Authentication Flow

- JWT-based authentication
- Tokens stored in SecureStore (native) / localStorage (web)
- Role-based routing: `student` → Student tabs, `service_provider` → Provider tabs

## 📋 Contract Flow

```
Student creates contract request
         ↓
[PENDING_PROVIDER_APPROVAL]
         ↓
Provider accepts/rejects
         ↓
[AWAITING_STUDENT_CONFIRMATION] or [REJECTED]
         ↓
Student confirms
         ↓
[ACTIVE] → Capacity reserved
```

## 🧪 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | sarah@example.com | password123 |
| Student | fatima@example.com | password123 |
| Provider | safetransport@example.com | password123 |
| Provider | comfort.residence@example.com | password123 |

## 🔧 API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Services
- `GET /api/services` - List services
- `GET /api/services/{id}` - Service details

### Contracts
- `POST /api/contracts` - Create contract request
- `GET /api/contracts/student/my-contracts` - Student's contracts
- `GET /api/contracts/provider/my-contracts` - Provider's contracts
- `POST /api/contracts/{id}/provider-accept` - Provider accepts
- `POST /api/contracts/{id}/provider-reject` - Provider rejects
- `POST /api/contracts/{id}/student-confirm` - Student confirms

### Chat
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/{id}/messages` - Get messages
- `POST /api/conversations/{id}/messages` - Send message

### Payments
- `POST /api/payments` - Make payment (mock)
- `GET /api/payments/provider/earnings` - Provider earnings

## 📄 License

Proprietary - Muyassir Platform
