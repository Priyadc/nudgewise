import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ok = (data, status = 200) => NextResponse.json(data, { status });
export const fail = (error, status = 400, details) =>
  NextResponse.json({ error, ...(details ? { details } : {}) }, { status });

export const isId = (id) => mongoose.isValidObjectId(id);

export function assertId(id) {
  if (!isId(id)) throw new HttpError(400, 'Invalid id');
}

/** Reads an ISO date from the query string, falling back when missing/invalid */
export function dateParam(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : fallback;
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

/**
 * Wraps an App Router route handler with:
 *  - session check (401 when signed out)
 *  - database connection
 *  - consistent error responses (validation → 422, HttpError → its status, anything else → 500)
 */
export function route(handler, { auth = true } = {}) {
  return async (req, ctx = {}) => {
    try {
      let userId = null;
      if (auth) {
        const session = await getServerSession(authOptions);
        userId = session?.user?.id;
        if (!userId) return fail('Unauthorized', 401);
      }
      await dbConnect();
      const params = ctx.params ? await ctx.params : {};
      return await handler(req, { params, userId });
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(err.issues[0]?.message || 'Validation failed', 422, err.flatten());
      }
      if (err instanceof HttpError) return fail(err.message, err.status);
      console.error('[api]', err);
      return fail('Something went wrong. Please try again.', 500);
    }
  };
}
