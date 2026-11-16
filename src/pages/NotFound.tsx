/**
 * 404 Page Not Found (`Yg` in Base44)
 */

import { useLocation, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathName = location.pathname.substring(1);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-muted-foreground/40">404</h1>
          <div className="mx-auto h-0.5 w-16 bg-border" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-foreground">Page Not Found</h2>
          <p className="leading-relaxed text-muted-foreground">
            The page <span className="font-medium text-foreground">"{pathName}"</span> could not be
            found in this application.
          </p>
        </div>
        <div className="pt-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
