# Setup Guide

## Step 1: Install Dependencies

Navigate to the server directory:
```bash
cd server
```

Install dependencies:
```bash
pnpm install
```

## Step 2: Create Database in pgAdmin

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name it: `DEPOT`
5. Click "Save"

## Step 3: Configure Environment

Create a `.env` file in the server directory:

```env
DATABASE_URL="postgresql://postgres:user@localhost:5432/DEPOT?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

## Step 4: Generate Prisma Client

```bash
pnpm prisma:generate
```

## Step 5: Run Migrations

This will create all the tables in your DEPOT database:

```bash
pnpm prisma:migrate
```

When prompted, enter a migration name (e.g., "init")

## Step 6: Start the Application

```bash
pnpm start:dev
```

The API will be available at:
- API: http://localhost:3000
- Swagger Documentation: http://localhost:3000/api

## Database Tables Created

After running migrations, the following tables will be created in the DEPOT database:

- `users` - User authentication
- `clients` - Client information
- `co_clients` - Co-client information
- `categories` - Product categories
- `products` - Product information
- `product_photos` - Product photos
- `commands` - Order/command information
- `command_details` - Command details

## Testing the API

You can test the API using:
1. Swagger UI at http://localhost:3000/api
2. Postman or any HTTP client
3. cURL commands

Example: Get all clients
```bash
curl http://localhost:3000/clients?page=1&limit=10
```
