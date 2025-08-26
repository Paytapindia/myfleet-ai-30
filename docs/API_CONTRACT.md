# API Contract Overview

This document summarizes the API surface expected by the frontend. All endpoints are JWT-protected unless noted. Pagination: page, pageSize. Dates in ISO 8601.

Sections
- Auth & Users
- Vehicles
- Drivers
- Trips
- Transactions & Analytics
- Payments (Cashfree)
- Files

Auth & Users
- POST /auth/otp { phone }
- POST /auth/verify { phone, otp } -> { token, user }
- GET /users/me -> User
- PUT /users/me -> User
- POST /users/me/subscription { plan, startAt, endAt } -> Subscription

Vehicles
- GET /vehicles -> { items: Vehicle[], total }
- POST /vehicles -> Vehicle
- GET /vehicles/{id} -> Vehicle
- PUT /vehicles/{id} -> Vehicle
- DELETE /vehicles/{id}
- POST /vehicles/{id}/assign-driver { driverId }
- POST /vehicles/{id}/unassign-driver { driverId }

Drivers
- GET /drivers -> { items: Driver[], total }
- POST /drivers -> Driver
- GET /drivers/{id} -> Driver
- PUT /drivers/{id} -> Driver
- DELETE /drivers/{id}

Trips
- GET /trips -> { items: Trip[], total }
- POST /trips -> Trip
- GET /trips/{id} -> Trip
- PUT /trips/{id} -> Trip
- POST /trips/{id}/status { status } -> Trip
- DELETE /trips/{id}

Transactions & Analytics
- GET /transactions -> { items: Transaction[], total }
- POST /transactions -> Transaction
- GET /transactions/{id} -> Transaction
- PUT /transactions/{id} -> Transaction
- DELETE /transactions/{id}
- GET /transactions/analytics?period=today|weekly|monthly|yearly -> { revenue, expenses, net }

Payments (Cashfree)
- POST /payments/cashfree/order { plan, customer, returnUrl } -> { payment_session_id, order_id }
- POST /payments/cashfree/verify { orderId } -> { isPaid, plan, raw }

Files
- POST /files multipart/form-data -> { id, url }

Notes
- The app ships with APP_CONFIG.useApi=false (no network). Flip to true to enable calls.
- Endpoints are also defined in src/api/endpoints.ts
