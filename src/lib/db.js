import mongoose from 'mongoose';

/**
 * Cached MongoDB connection.
 * Serverless functions (Vercel) re-use the same process between requests,
 * so we keep the connection on `global` instead of reconnecting every time.
 */
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false, maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
