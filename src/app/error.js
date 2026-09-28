'use client';

export default function GlobalError({ error, reset }) {
  return (
    <div className="not-found">
      <div className="stack" style={{ alignItems: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 56 }}>🛰️</div>
        <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
        <p className="muted">{error?.message?.includes('MONGODB_URI') ? 'The database is not configured. Check your .env.local file.' : 'An unexpected error happened. Please try again.'}</p>
        <button className="btn btn-primary" onClick={() => reset()} style={{ marginTop: 10 }}>
          Try again
        </button>
      </div>
    </div>
  );
}
