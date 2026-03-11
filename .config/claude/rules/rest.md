## REST API Design

### URL Design
- URLs represent **resources (nouns)**, never actions (verbs)
- HTTP method defines the action: GET = retrieve, POST = create, PUT/PATCH = update, DELETE = remove
- **Wrong:** `GET /getUsers`, `POST /createUser`, `DELETE /deleteUser/5`
- **Right:** `GET /users`, `POST /users`, `DELETE /users/5`

### API Versioning
- Always version APIs: `/api/v1/users`
- When breaking changes are needed, create `/api/v2/...` — old clients stay on v1
- Versioning is mandatory for any API used by multiple clients or exposed publicly

### HTTP Status Codes
Use correct status codes — never return 200 for everything:
- `200` — Success
- `201` — Resource created
- `401` — Not authenticated
- `403` — Authenticated but not authorized
- `404` — Resource not found
- `422` — Validation error
- `500` — Internal server error

### Consistent Naming
- Pick one convention (snake_case or camelCase) and use it **everywhere**
- Never mix naming formats across endpoints

### Pagination
- Never return unbounded collections — always paginate
- Use query parameters: `GET /users?page=1&limit=10`
- Return metadata alongside data:
  ```json
  {
    "data": [...],
    "meta": { "current_page": 1, "total": 1000 }
  }
  ```

### Filtering & Sorting
- Use query parameters, not separate endpoints
- **Wrong:** `GET /getActiveUsersSortedByName`
- **Right:** `GET /users?status=active&sort=name`

### Error Responses
- Always return structured error objects, never bare strings
- Include a machine-readable code and a human-readable message:
  ```json
  {
    "error": { "code": 404, "message": "User not found" }
  }
  ```
- Error format must be consistent across all endpoints

### Authentication vs Authorization
- **Authentication** = who are you (identity verification)
- **Authorization** = what are you allowed to do (permission checks)
- Keep these as separate concerns — use token-based auth (JWT, OAuth)
- Never rely on frontend-only access control; enforce on the server

### Security
- Always use HTTPS
- Validate all input on every request
- Implement rate limiting
- Never expose sensitive fields (passwords, tokens, internal IDs) in responses

### API ≠ Database
- Design responses around **client needs**, not database schema
- Combine, hide, or transform fields as needed
- The API is a contract — internal schema changes should not break it
