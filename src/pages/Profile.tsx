/**
 * User Profile & Security Page (TimeTrack standard)
 */

import { useState, useEffect, type FormEvent } from 'react';
import { User, KeyRound, ShieldCheck, Loader2, Sparkles, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authApi, herApi, ApiError, type CustomerLoyaltyRecord } from '../services/api';
import { Badge, Button, Input, Label } from '../components/ui';
import { LOYALTY_TIERS } from '../lib/brand';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [loyalty, setLoyalty] = useState<CustomerLoyaltyRecord | null>(null);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    herApi
      .getLoyalty()
      .then((res) => setLoyalty(res))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile({ fullName, phone });
      await refresh();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Account & security</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your personal details and account password.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/5 uppercase text-primary">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          {user?.role}
        </Badge>
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="space-y-4 rounded-3xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-foreground">Personal details</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="prof-name">Full name</Label>
            <Input
              id="prof-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="prof-email">Email</Label>
            <Input
              id="prof-email"
              value={user?.email || ''}
              disabled
              className="mt-2 opacity-70"
            />
          </div>
          <div>
            <Label htmlFor="prof-phone">Phone number</Label>
            <Input
              id="prof-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 82 555 0100"
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="rounded-full" disabled={savingProfile}>
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save details
          </Button>
        </div>
      </form>

      {/* Floor 1: HER Beauty Loyalty Tier & Personalised Texture/Care Profile */}
      {loyalty && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingLoyalty(true);
            try {
              const updated = await herApi.updateLoyalty({
                preferredStylist: loyalty.preferredStylist,
                hairType: loyalty.hairType,
                skinConcerns: loyalty.skinConcerns,
                allergies: loyalty.allergies,
              });
              setLoyalty(updated);
              toast.success('HER Beauty care & loyalty preferences saved.');
            } catch (err: any) {
              toast.error(err.message || 'Could not update care profile');
            } finally {
              setSavingLoyalty(false);
            }
          }}
          className="space-y-5 rounded-3xl border border-border bg-card p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg text-foreground">
                  HER Loyalty & Personalised Care Profile
                </h2>
                <p className="text-xs text-muted-foreground">
                  Protected under POPIA (Act 4 of 2013) · Shared only with your assigned artisan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="rounded-full">
                <Sparkles className="mr-1 h-3 w-3" />
                {loyalty.tier}
              </Badge>
              <Badge variant="outline" className="rounded-full font-mono text-xs">
                {loyalty.beautyPoints.toLocaleString()} Beauty Pts · Code: {loyalty.referralCode}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {LOYALTY_TIERS.map((tier) => {
              const active = loyalty.tier === tier.name;
              return (
                <div
                  key={tier.name}
                  className={`rounded-2xl border p-3.5 text-xs ${
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="font-semibold text-foreground">{tier.name}</strong>
                    <span className="font-mono text-[10px]">{tier.pointsRequired}+ pts</span>
                  </div>
                  <p className="mt-1">{tier.perk}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="loy-stylist">Preferred Artisan</Label>
              <Input
                id="loy-stylist"
                value={loyalty.preferredStylist}
                onChange={(e) => setLoyalty({ ...loyalty, preferredStylist: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="loy-hair">Hair Texture & Porosity</Label>
              <Input
                id="loy-hair"
                value={loyalty.hairType}
                onChange={(e) => setLoyalty({ ...loyalty, hairType: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="loy-skin">Skin & Scalp Focus</Label>
              <Input
                id="loy-skin"
                value={loyalty.skinConcerns}
                onChange={(e) => setLoyalty({ ...loyalty, skinConcerns: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="loy-allergy">Botanical Preferences & Allergies</Label>
              <Input
                id="loy-allergy"
                value={loyalty.allergies}
                onChange={(e) => setLoyalty({ ...loyalty, allergies: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="outline" className="rounded-full" disabled={savingLoyalty}>
              {savingLoyalty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Care Preferences
            </Button>
          </div>
        </form>
      )}

      <form
        onSubmit={handleChangePassword}
        className="space-y-4 rounded-3xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-foreground">Change password</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="curr-pwd">Current password</Label>
            <Input
              id="curr-pwd"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="new-pwd">New password</Label>
            <Input
              id="new-pwd"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="conf-pwd">Confirm new password</Label>
            <Input
              id="conf-pwd"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="outline" className="rounded-full" disabled={savingPassword}>
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}
