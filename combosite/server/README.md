# Hadoukraft API

The API uses PostgreSQL for users, sessions, combos, likes, and rate limits. Video files remain in `server/uploads`; combo video metadata is stored in PostgreSQL as JSONB.

## Configuration

1. Create a PostgreSQL database named `hadoukraft`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm run dev`. Tables and indexes are created automatically.

Check the connection at `http://localhost:3100/api/health`. Authenticated routes require `Authorization: Bearer <token>`.
