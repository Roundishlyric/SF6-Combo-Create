# Hadoukraft API

The API uses PostgreSQL for users, sessions, combos, likes, and rate limits. Video files remain in `server/uploads`; combo video metadata is stored in PostgreSQL as JSONB.

## Configuration

1. Create a PostgreSQL database named `hadoukraft`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm run dev`. Tables and indexes are created automatically.

## Import existing MongoDB data

Keep `MONGODB_URI` and `MONGODB_DB` in `.env`, then run:

```sh
npm run migrate:mongo
```

The import is transactional and repeatable: records are inserted or updated by their existing IDs. Only unexpired sessions and rate limits are copied. After verifying the application, remove the MongoDB variables and dependency if you no longer need to rerun the importer.

Check the connection at `http://localhost:3100/api/health`. Authenticated routes require `Authorization: Bearer <token>`.
