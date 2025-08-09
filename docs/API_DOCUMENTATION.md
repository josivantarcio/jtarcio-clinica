# EO CLÍNICA - API Documentation
## Complete REST API Reference

### 🌐 BASE URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.eo-clinica.com/api/v1`

### 🔐 AUTHENTICATION

All protected endpoints require JWT authentication:

```bash
Authorization: Bearer <jwt_token>
```

**Token Lifecycle:**
- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 7 days
- **MFA Required**: For admin operations

---

## 🔑 AUTHENTICATION ENDPOINTS

### POST `/auth/login`
User authentication with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "PATIENT",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    },
    "mfaRequired": false
  }
}
```

### POST `/auth/register`
Register new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+5511999999999",
  "role": "PATIENT"
}
```

### POST `/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### POST `/auth/logout`
Invalidate user session and tokens.

### POST `/auth/forgot-password`
Request password reset via email.

### POST `/auth/reset-password`
Reset password using reset token.

---

## 👤 USER MANAGEMENT ENDPOINTS

### GET `/users/me`
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PATIENT",
    "status": "ACTIVE",
    "patientProfile": {
      "allergies": ["Penicilina"],
      "medications": ["Ibuprofeno"]
    }
  }
}
```

### PATCH `/users/me`
Update current user profile.

### GET `/users` 🔒 *Admin Only*
List all users with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `role`: Filter by user role
- `status`: Filter by user status
- `search`: Search by name or email

### GET `/users/:id` 🔒 *Admin/Self Only*
Get user details by ID.

### PATCH `/users/:id` 🔒 *Admin/Self Only*
Update user information.

### DELETE `/users/:id` 🔒 *Admin Only*
Soft delete user account.

---

## 🏥 APPOINTMENT ENDPOINTS

### POST `/appointments`
Create new appointment.

**Request:**
```json
{
  "doctorId": "uuid",
  "specialtyId": "uuid",
  "scheduledAt": "2024-12-10T14:30:00Z",
  "type": "CONSULTATION",
  "reason": "Consulta de rotina",
  "symptoms": "Dor de cabeça frequente"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "doctorId": "uuid",
    "specialtyId": "uuid",
    "scheduledAt": "2024-12-10T14:30:00Z",
    "endTime": "2024-12-10T15:00:00Z",
    "status": "SCHEDULED",
    "type": "CONSULTATION",
    "reason": "Consulta de rotina",
    "confirmationCode": "ABC123"
  }
}
```

### GET `/appointments`
List appointments with filters.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status
- `doctorId`: Filter by doctor
- `patientId`: Filter by patient (auto-applied for patients)
- `startDate`, `endDate`: Date range filter
- `specialtyId`: Filter by specialty

### GET `/appointments/:id`
Get appointment details.

### PATCH `/appointments/:id`
Update appointment information.

### POST `/appointments/:id/reschedule`
Reschedule appointment to new time.

**Request:**
```json
{
  "newScheduledAt": "2024-12-11T15:00:00Z",
  "reason": "Conflito de agenda"
}
```

### POST `/appointments/:id/cancel`
Cancel appointment.

**Request:**
```json
{
  "reason": "Não pode comparecer",
  "cancelledBy": "PATIENT"
}
```

### POST `/appointments/:id/confirm`
Confirm appointment attendance.

### POST `/appointments/:id/complete`
Mark appointment as completed with clinical notes.

**Request:**
```json
{
  "diagnosis": "Cefaleia tensional",
  "prescription": "Ibuprofeno 600mg",
  "notes": "Paciente apresentou melhora dos sintomas",
  "followUpRequired": true
}
```

---

## 📅 AVAILABILITY ENDPOINTS

### GET `/availability/doctor/:doctorId`
Get doctor availability for scheduling.

**Query Parameters:**
- `startDate`: Start date for availability check
- `endDate`: End date (default: 30 days from start)
- `duration`: Appointment duration in minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "availableSlots": [
      {
        "date": "2024-12-10",
        "slots": [
          {
            "startTime": "14:30",
            "endTime": "15:00",
            "available": true
          }
        ]
      }
    ]
  }
}
```

### GET `/availability/specialty/:specialtyId`
Get availability by medical specialty.

### POST `/availability/bulk-check`
Check availability for multiple doctors/times.

**Request:**
```json
{
  "requests": [
    {
      "doctorId": "uuid",
      "date": "2024-12-10",
      "startTime": "14:30",
      "duration": 30
    }
  ]
}
```

---

## 🏥 SPECIALTIES ENDPOINTS

### GET `/specialties`
List all medical specialties.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Cardiologia",
      "description": "Especialidade médica cardiovascular",
      "duration": 45,
      "isActive": true,
      "doctorsCount": 5
    }
  ]
}
```

### GET `/specialties/:id`
Get specialty details.

### GET `/specialties/:id/doctors`
Get doctors by specialty.

### POST `/specialties` 🔒 *Admin Only*
Create new medical specialty.

### PATCH `/specialties/:id` 🔒 *Admin Only*
Update specialty information.

---

## 🤖 AI CHAT ENDPOINTS

### POST `/chat/conversations`
Start new conversation with AI.

**Request:**
```json
{
  "message": "Olá, gostaria de agendar uma consulta"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "message": {
      "id": "uuid",
      "role": "assistant",
      "content": "Olá! Posso ajudá-lo com o agendamento. Qual especialidade você precisa?"
    }
  }
}
```

### POST `/chat/conversations/:id/messages`
Send message to existing conversation.

### GET `/chat/conversations/:id/messages`
Get conversation message history.

### GET `/chat/conversations`
List user conversations.

### DELETE `/chat/conversations/:id`
Delete conversation and messages.

---

## 📧 NOTIFICATION ENDPOINTS

### GET `/notifications`
Get user notifications.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (PENDING, SENT, DELIVERED, FAILED)
- `type`: Filter by type (EMAIL, SMS, WHATSAPP, PUSH)

### PATCH `/notifications/:id/read`
Mark notification as read.

### POST `/notifications/preferences`
Update notification preferences.

**Request:**
```json
{
  "emailEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": true,
  "appointmentReminders": true,
  "marketingCommunications": false
}
```

---

## 🔍 AUDIT ENDPOINTS

### GET `/audit/logs` 🔒 *Admin Only*
Get audit logs with filters.

**Query Parameters:**
- `userId`: Filter by user
- `action`: Filter by action type
- `resource`: Filter by resource type
- `startDate`, `endDate`: Date range
- `page`, `limit`: Pagination

### GET `/audit/my-history`
Get current user's audit history.

### GET `/audit/statistics` 🔒 *Admin Only*
Get audit statistics and analytics.

### GET `/audit/export` 🔒 *Admin Only*
Export audit logs (CSV/JSON).

---

## 🔐 SECURITY ENDPOINTS

### POST `/security/mfa/setup`
Setup Multi-Factor Authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "data:image/png;base64,...",
    "backupCodes": ["12345678", "87654321"]
  }
}
```

### POST `/security/mfa/verify`
Verify and enable MFA.

**Request:**
```json
{
  "token": "123456"
}
```

### POST `/security/mfa/authenticate`
Authenticate with MFA token.

### POST `/security/mfa/sms`
Send SMS code for authentication.

### DELETE `/security/mfa/disable`
Disable MFA for account.

---

## 📊 LGPD COMPLIANCE ENDPOINTS

### POST `/lgpd/consent`
Record user consent for data processing.

**Request:**
```json
{
  "consentType": "MEDICAL_DATA_PROCESSING",
  "granted": true,
  "version": "1.0"
}
```

### GET `/lgpd/consents`
Get user consent history.

### POST `/lgpd/data-export`
Request data export (portability).

**Request:**
```json
{
  "requestType": "PORTABILITY",
  "requestedData": ["identificationData", "medicalData", "appointmentData"]
}
```

### POST `/lgpd/data-deletion`
Request data deletion/anonymization.

**Request:**
```json
{
  "requestType": "ANONYMIZATION",
  "reason": "Não utiliza mais os serviços"
}
```

### GET `/lgpd/data-mapping`
Get complete data mapping for user.

---

## 📈 ANALYTICS ENDPOINTS

### GET `/analytics/dashboard` 🔒 *Doctor/Admin*
Get dashboard analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": {
      "total": 150,
      "thisWeek": 25,
      "confirmed": 120,
      "cancelled": 15
    },
    "patients": {
      "total": 85,
      "new": 5,
      "returning": 20
    },
    "revenue": {
      "thisMonth": 15000.00,
      "lastMonth": 12500.00,
      "growth": 20
    }
  }
}
```

### GET `/analytics/appointments` 🔒 *Doctor/Admin*
Get appointment analytics.

### GET `/analytics/patients` 🔒 *Doctor/Admin*
Get patient analytics.

### GET `/analytics/revenue` 🔒 *Admin Only*
Get revenue analytics.

---

## 🔄 N8N WORKFLOW ENDPOINTS

### GET `/n8n/workflows` 🔒 *Admin Only*
List active workflows.

### POST `/n8n/workflows/:id/trigger` 🔒 *Admin Only*
Manually trigger workflow.

### GET `/n8n/executions` 🔒 *Admin Only*
Get workflow execution history.

### GET `/n8n/health`
Check N8N system health.

---

## ⚡ WEBHOOK ENDPOINTS

### POST `/webhooks/whatsapp`
WhatsApp Business webhook for message status.

### POST `/webhooks/sms`
SMS delivery webhook from Twilio.

### POST `/webhooks/calendar`
Google Calendar change notifications.

---

## 🏥 SYSTEM ENDPOINTS

### GET `/health`
System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "ai": "healthy"
  },
  "version": "1.0.0"
}
```

### GET `/version`
Get system version information.

---

## 📝 ERROR RESPONSES

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400): Input validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## 📊 PAGINATION

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field
- `sortOrder`: 'asc' or 'desc' (default: 'desc')

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🔐 RATE LIMITING

- **Default**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Password Reset**: 3 requests per hour per email
- **MFA**: 5 attempts per 15 minutes per user

**Headers:**
- `X-Rate-Limit-Limit`: Request limit
- `X-Rate-Limit-Remaining`: Remaining requests
- `X-Rate-Limit-Reset`: Reset timestamp

---

## 🧪 TESTING

### Postman Collection
Import the complete API collection: `docs/postman/eo-clinica-api.json`

### Test Users
```json
{
  "admin": "admin@eo-clinica.com",
  "doctor": "dr.silva@eo-clinica.com",
  "patient": "paciente@example.com",
  "receptionist": "recepcao@eo-clinica.com"
}
```
**Password**: `Admin123!` (for all test users)

---

**🔗 Interactive API Explorer**: `/documentation` (Swagger UI)