/**
 * Forced Password Change Modal (from TimeTrack security standard)
 */

import { useState, type FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, ApiError } from '../../services/api';
import { Button, Input, Label } from '../ui';

export default function ChangePasswordModal({
  allowKeep,
  onSuccess,
}: {
  allowKeep?: boolean;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ newPassword });
      toast.success('Password updated successfully.');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeep = async () => {
    setSubmitting(true);
    try {
      await authApi.keepPassword();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Cannot keep temporary password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h2 className="text-center font-display text-2xl text-foreground">
          Update your temporary password
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          For security, please choose a new password before continuing to your workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-pwd">New password</Label>
            <Input
              id="new-pwd"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-2 h-11"
            />
          </div>
          <div>
            <Label htmlFor="confirm-pwd">Confirm new password</Label>
            <Input
              id="confirm-pwd"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="mt-2 h-11"
            />
          </div>

          <Button type="submit" className="h-11 w-full rounded-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save new password
          </Button>
          {allowKeep && (
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full"
              onClick={handleKeep}
              disabled={submitting}
            >
              Keep current password
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
