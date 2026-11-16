/**
 * Login Page (`D_` and `w_` in Base44 + TimeTrack session banners)
 * ---------------------------------------------------------------
 * Reproduces the exact Base44 auth shell (icon badge, Welcome back,
 * Continue with Google button, Email & Password inputs, Forgot password link)
 * with TimeTrack's session revocation & suspension banners.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2, Ban, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Label, BrandLogo } from '../components/ui';
import { ApiError } from '../services/api';
import { BRAND } from '../lib/brand';

export default function Login() {
  const { login, sessionError, clearSessionError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rawReturnTo = searchParams.get('returnTo') || '/';
  const returnTo =
    rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(returnTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="mb-4 inline-flex">
            <BrandLogo className="h-16 w-16" chip />
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Welcome to {BRAND.name}
          </h1>
          <p className="mt-2 text-muted-foreground">{BRAND.slogan}</p>
        </div>

        {sessionError && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {sessionError.code === 'COMPANY_SUSPENDED' ? (
              <Ban className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {sessionError.code === 'COMPANY_SUSPENDED'
                  ? 'Business Account Suspended'
                  : 'Session Ended'}
              </p>
              <p className="mt-0.5 text-xs opacity-90">{sessionError.message}</p>
            </div>
            <button
              type="button"
              onClick={clearSessionError}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full font-medium" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to={`/register${returnTo === '/' ? '' : `?returnTo=${encodeURIComponent(returnTo)}`}`}
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
