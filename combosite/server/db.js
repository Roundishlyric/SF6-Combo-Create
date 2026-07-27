import { MongoClient } from 'mongodb';

let client;
let database;

export async function connectDatabase() {
  if (database) return database;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB connection string.');
  }

  client = new MongoClient(uri, {
    appName: 'Hadoukraft',
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  database = client.db(process.env.MONGODB_DB || 'hadoukraft');

  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('sessions').createIndex({ token: 1 }, { unique: true }),
    database.collection('sessions').createIndex({ userId: 1 }),
    database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection('rateLimits').createIndex({ key: 1 }, { unique: true }),
    database.collection('rateLimits').createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection('combos').createIndex({ userId: 1, updatedAt: -1 }),
    database.collection('likes').createIndex({ userId: 1, comboId: 1 }, { unique: true }),
    database.collection('likes').createIndex({ comboId: 1 }),
  ]);

  // Sessions created before expiration was introduced must not remain valid forever.
  await database.collection('sessions').deleteMany({ expiresAt: { $exists: false } });

  return database;
}

export async function collections() {
  const db = await connectDatabase();
  return {
    users: db.collection('users'),
    sessions: db.collection('sessions'),
    combos: db.collection('combos'),
    likes: db.collection('likes'),
    rateLimits: db.collection('rateLimits'),
  };
}

export async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}
