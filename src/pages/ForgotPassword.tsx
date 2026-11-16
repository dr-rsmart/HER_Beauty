/**
 * Forgot Password Page (TimeTrack standard)
 * -----------------------------------------
 * Allows practitioners, managers, and customers to find their business administrator
 * or platform operator contact for password resets, with default Password123 recovery.
 */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, KeyRound, Building2, User } from 'lucide-react';
import { authApi } from '../services/api';
import { Button, Input, Label } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    adminEmail: string | null;
    adminName: string | null;
    providerName?: string | null;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email);
      setResult({
        message: res.message,
        adminEmail: res.adminEmail,
        adminName: res.adminName,
        providerName: res.providerName,
      });
    } catch {
      setResult({
        message: 'Please reach out to your business administrator to reset your password.',
        adminEmail: 'admin@bookingtrack.com',
        adminName: 'Business Administrator',
        providerName: 'BookingTrack',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <KeyRound className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Forgot Password
          </h1>
          <p className="mt-2 text-muted-foreground">
            Look up your business administrator to request a password reset
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {result ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                  Contact Your Business Administrator
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.providerName ? `For business: ${result.providerName}` : 'BookingTrack Workspace'}
                </p>

                {result.adminEmail && (
                  <div className="mt-4 rounded-xl border border-border bg-background p-3 text-sm">
                    {result.adminName && (
                      <p className="flex items-center justify-center gap-1.5 font-medium text-foreground">
                        <User className="h-4 w-4 text-primary" /> {result.adminName}
                      </p>
                    )}
                    <a
                      href={`mailto:${result.adminEmail}?subject=BookingTrack%20Password%20Reset%20Request%20(${encodeURIComponent(email)})`}
                      className="mt-1 block font-semibold text-primary underline hover:text-primary/80 break-all"
                    >
                      {result.adminEmail}
                    </a>
                  </div>
                )}

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Once your administrator resets your password, you can sign in with the default password{' '}
                  <strong className="text-foreground">Password123</strong> and choose a new password on login or keep it.
                </p>
              </div>

              <Button
                type="button"
                className="h-11 w-full rounded-full"
                onClick={() => {
                  setResult(null);
                  setEmail('');
                }}
              >
                Look up another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Your Account Email</Label>
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
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the email address associated with your practitioner or customer account.
                </p>
              </div>

              <Button type="submit" className="h-12 w-full font-medium" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Looking up administrator...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" /> Find My Business Admin
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
