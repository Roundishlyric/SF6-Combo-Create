# Hadoukraft API

The API uses MongoDB for users, sessions, and combos. Optional video files remain in `server/uploads`, while their metadata and URL are stored in MongoDB.

## Configuration

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your local MongoDB or Atlas connection string.
3. Optionally set `SESSION_TTL_DAYS` (defaults to 7, with a supported range of 1–90 days).
4. Set `TRUST_PROXY=true` only when the API runs behind a trusted reverse proxy that supplies `X-Forwarded-For`.
5. For Atlas, create a database user and add your current IP address to the Atlas IP access list.
6. Run `npm run dev` from the `combosite` directory.

The server creates these collections and indexes automatically:

- `users` with a unique email index
- `sessions` with unique-token and automatic-expiration indexes
- `rateLimits` with automatic TTL cleanup
- `combos` indexed by user and update time

Check the connection at `http://localhost:3100/api/health`. A successful response includes `"database":"connected"`.

Authenticated routes require `Authorization: Bearer <token>`. Combo routes support listing, creation, updating, duplication, and deletion. Videos use `POST /api/videos` and are served from `/uploads/:file`.
