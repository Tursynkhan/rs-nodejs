# Product Catalog CRUD API

A RESTful CRUD API for managing a product catalog, built with **Fastify** and **TypeScript**. Uses an in-memory database, Zod for request validation, and supports both single-instance and horizontally-scaled cluster modes.

## Requirements

- Node.js `24.10.0` or higher
- npm

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env

# 4. Start the development server
npm run start:dev
```

The server will be available at `http://localhost:4000`.


## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with hot-reload via `tsx watch` |
| `npm run start:prod` | Compile TypeScript then run the built output |
| `npm run start:multi` | Compile then start in cluster mode with a load balancer |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run the Jest test suite |

