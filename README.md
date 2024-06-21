## Hono Pokemon API
### Overview
This is a RESTful API built using Hono, Prisma, and various Node.js libraries. It provides endpoints for user registration, login, Pokémon operations, and authentication using JWT tokens. Additionally, it includes rate limiting to prevent abuse and ensure fair usage of the API.

## Technologies Used
- Hono: A lightweight framework for building APIs.
- Prisma: A modern database toolkit for Node.js and TypeScript.
- bcryptjs: Library for hashing passwords.
- jsonwebtoken: Library for generating and verifying JWT tokens.
- axios: Promise-based HTTP client for making API requests.
- cors: Middleware for enabling CORS in API endpoints.
- express-rate-limit: Middleware for rate limiting HTTP requests.

## Setup
1. Install Dependencies: Run 
```
npm install 
```
 to install all required dependencies.

2. Environment Variables: Create a .env file in the root directory with the following variables to store JWT token and URL to your DB
```
JWT_SECRET=mySecretKey
DATABASE_URL=postgresql://user:password@localhost:5432/database
```
3. Database migration:  Run Prisma migrations to set up the database schema.
```
npx prisma migrate dev
```
4. Start the serve
```
npm run dev
```

### Rate Limiting Setup
To prevent abuse and ensure availability, rate limiting is implemented using express-rate-limit middleware.


## Endpoints
### Public Endpoints
- POST /register: Register a new user with email, password, and username.
- POST /login: Authenticate user credentials and receive a JWT token for subsequent requests.
- GET /pokemon/
: Fetch Pokémon data from PokeAPI by name.
### Protected Endpoints (Requires Authentication)
- POST /protected/catch: Allow authenticated users to catch a Pokémon by name, type, and image URL.
- DELETE /protected/release/
: Release a caught Pokémon by its ID.
- GET /protected/caught: Retrieve all Pokémon caught by the authenticated user.
- POST /pokemon: Create a new Pokémon record.
- GET /pokemon/records: Retrieve all Pokémon records.
- PATCH /pokemon/update: Update an existing Pokémon record.
- DELETE /pokemon/delete: Delete a Pokémon record by its ID.

## Error Handling
The API handles common errors such as invalid credentials, duplicate entries, and database access failures with appropriate HTTP status codes and error messages.
Contributing

