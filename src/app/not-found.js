import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="stack" style={{ alignItems: 'center' }}>
        <div className="big gradient-text">404</div>
        <h1 style={{ fontSize: 26 }}>This page wandered off</h1>
        <p className="muted">The page you are looking for does not exist or was moved.</p>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 10 }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
