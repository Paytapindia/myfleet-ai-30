# Direct API Gateway Integration Guide

This guide explains how to use the direct API Gateway integration that bypasses Supabase edge functions and communicates directly with your AWS Lambda functions.

## Overview

The frontend now communicates directly with your AWS API Gateway/Lambda instead of going through Supabase edge functions:

**Previous Flow:**
```
Frontend -> Supabase Edge Function -> AWS Lambda -> External APIs
```

**New Flow:**
```
Frontend -> AWS API Gateway/Lambda -> External APIs
```

## Configuration

### 1. Update API Configuration

Edit `src/api/appConfig.ts`:

```typescript
export const APP_CONFIG = {
  useApi: true, // Enable direct API calls
  apiBaseUrl: "https://your-api-gateway-url.amazonaws.com/prod", // Your actual API Gateway URL
  timeoutMs: 30000, // Timeout for verification calls
};
```

### 2. Set Proxy Token (Optional)

If your Lambda requires a proxy token for security, set it in your environment or directly in the DirectApiClient:

```typescript
// In src/services/directApi.ts
this.proxyToken = "your-actual-proxy-token";
```

## API Endpoints

Your Lambda function should handle these endpoints:

### 1. Vehicle Information (`/vehicle-info`)
Handles RC, FASTag, and Challans verification:

```json
// RC Verification
{
  "service": "rc",
  "type": "rc",
  "vehicleId": "MH12AB1234",
  "vehicleNumber": "MH12AB1234",
  "forceRefresh": false
}

// FASTag Verification  
{
  "service": "fastag",
  "type": "fastag",
  "vehicleId": "MH12AB1234",
  "vehicleNumber": "MH12AB1234",
  "forceRefresh": false
}

// Challans Verification
{
  "service": "challans",
  "type": "challans",
  "vehicleId": "MH12AB1234",
  "vehicleNumber": "MH12AB1234",
  "chassis": "chassis_number",
  "engine_no": "engine_number", 
  "forceRefresh": false
}
```

### 2. Vehicle CRUD (`/vehicle-crud`)
Handles vehicle management operations:

```json
// Create Vehicle
{
  "action": "create",
  "vehicleData": {
    "number": "MH12AB1234",
    "user_id": "user-uuid",
    "model": "Not specified"
  }
}

// Update Vehicle
{
  "action": "update",
  "vehicleId": "vehicle-uuid",
  "updates": {
    "model": "Honda City",
    "gps_linked": true
  }
}

// Delete Vehicle
{
  "action": "delete",
  "vehicleId": "vehicle-uuid"
}

// Assign Driver
{
  "action": "assign-driver",
  "vehicleId": "vehicle-uuid",
  "driverId": "driver-uuid",
  "userId": "user-uuid"
}

// Unassign Driver
{
  "action": "unassign-driver",
  "vehicleId": "vehicle-uuid",
  "driverId": "driver-uuid"
}
```

### 3. Health Check (`/health`)
Simple health check endpoint:

```json
{
  "action": "health"
}
```

## Expected Response Format

All endpoints should return this standardized format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  verifiedAt?: string;
  details?: string;
  code?: number;
  status?: string;
  message?: string;
  response?: any;
}
```

## Frontend Usage

### Using the Direct API Service

```typescript
import { directApi } from '@/services/directApi';

// RC Verification
const rcResult = await directApi.verifyRC('MH12AB1234');

// FASTag Verification
const fastagResult = await directApi.verifyFastag('MH12AB1234', true); // force refresh

// Challans Verification
const challansResult = await directApi.verifyChallan(
  'MH12AB1234', 
  'chassis_number', 
  'engine_number'
);
```

### Using the Hook (Recommended)

```typescript
import { useDirectApi } from '@/hooks/useDirectApi';

function MyComponent() {
  const { verifyRC, verifyFastag, verifyChallan } = useDirectApi();
  
  const handleVerifyRC = async () => {
    const result = await verifyRC('MH12AB1234');
    if (result.success) {
      console.log('RC Data:', result.data);
    } else {
      console.error('Error:', result.error);
    }
  };
}
```

## Lambda Requirements

Your Lambda function needs to:

1. **Handle CORS** - Return appropriate CORS headers
2. **Authentication** - Validate the Bearer token if needed
3. **Proxy Token** - Validate `x-proxy-token` header if configured
4. **Database Operations** - Handle vehicle CRUD operations in your database
5. **External API Calls** - Make calls to RC/FASTag/Challans APIs
6. **Error Handling** - Return standardized error responses

## Security Considerations

1. **API Gateway Configuration** - Enable CORS for your frontend domain
2. **Rate Limiting** - Implement rate limiting in your Lambda
3. **Authentication** - Validate user tokens appropriately
4. **Proxy Token** - Use a secure proxy token for additional security
5. **Input Validation** - Validate all input parameters in your Lambda
6. **HTTPS Only** - Ensure your API Gateway uses HTTPS

## Migration Notes

The following files have been updated for direct API integration:

- `src/services/directApi.ts` - New direct API client
- `src/hooks/useDirectApi.ts` - React hook for API operations
- `src/api/appConfig.ts` - API configuration updated
- `src/contexts/VehicleContext.tsx` - Uses direct API for RC verification
- `src/api/fastagApi.ts` - Uses direct API for FASTag verification  
- `src/components/ChallanModal.tsx` - Uses direct API for Challans verification

## Testing

1. **Update API Gateway URL** in `src/api/appConfig.ts`
2. **Test Health Check** - Verify basic connectivity
3. **Test Each Service** - RC, FASTag, Challans verification
4. **Test CRUD Operations** - Vehicle creation, update, deletion
5. **Test Error Handling** - Network errors, timeouts, invalid responses

## Rollback

To rollback to Supabase edge functions:

1. Set `useApi: false` in `src/api/appConfig.ts`
2. The code will automatically fall back to Supabase edge functions

## Benefits

- **Direct Communication** - Faster response times (no extra hop)
- **Full Control** - Complete control over your API layer
- **Independent** - No dependency on Supabase edge functions
- **Scalable** - Can handle high volumes with proper Lambda configuration
- **Secure** - Direct security controls in your Lambda function