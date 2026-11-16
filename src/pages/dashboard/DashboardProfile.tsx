/**
 * Provider Dashboard Business Profile (`nF` in Base44)
 * ----------------------------------------------------
 * Edit public business profile, working hours, cover photo,
 * and toggle search visibility (`published` vs `draft`).
 */

import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { providersApi } from '../../services/api';
import { useMyProvider } from '../../hooks/useMyProvider';
import DashboardSubNav from '../../components/dashboard/DashboardSubNav';
import BusinessForm from '../../components/dashboard/BusinessForm';
import { Button, Switch, Spinner, BrandLogo } from '../../components/ui';
import { BRAND, FOUNDER, BRAND_PILLARS, REVENUE_STREAMS, SOCIAL_CHANNELS } from '../../lib/brand';

export default function DashboardProfile() {
  const { provider, setProvider, loading } = useMyProvider();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!provider) return <Navigate to="/dashboard" replace />;

  const isPublished = provider.status !== 'draft';

  return (
    <div>
      <DashboardSubNav />
      <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-foreground">Business profile</h1>
            <p className="mt-2 text-muted-foreground">
              This is what customers see — address, contact details and opening hours.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate(`/providers/${provider.id}`)}
          >
            Preview public page
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6">
          <div>
            <p className="font-medium text-foreground">
              {isPublished ? 'Taking bookings' : 'Hidden from search'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPublished
                ? 'Customers can find and book you.'
                : 'Your page is only visible by direct link.'}
            </p>
          </div>
          <Switch
            checked={isPublished}
            onCheckedChange={async (checked) => {
              const updated = await providersApi.update(provider.id, {
                status: checked ? 'published' : 'draft',
              });
              setProvider({ ...provider, ...updated });
              toast.success(
                checked ? 'Business is now visible in search.' : 'Business hidden from search.',
              );
            }}
          />
        </div>

        <BusinessForm
          initial={provider}
          submitLabel="Save studio profile"
          onSubmit={async (patch) => {
            const updated = await providersApi.update(provider.id, patch);
            setProvider({ ...provider, ...updated });
            toast.success('Studio profile saved.');
          }}
        />

        {/* Floor 1: HER Brand Identity & Founder Governance Reference */}
        <div className="luxury-gradient rounded-3xl border border-brand-copper/40 p-6 text-brand-linen space-y-5">
          <div className="flex items-center gap-4">
            <BrandLogo className="h-14 w-14" chip />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-copperPale">
                Brand Governance Single Source of Truth
              </p>
              <h2 className="font-display text-xl text-brand-linen">{BRAND.enterpriseName}</h2>
              <p className="text-xs text-brand-copperLight">
                {FOUNDER.name} · {FOUNDER.title} ({FOUNDER.email})
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BRAND_PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-brand-copper/30 bg-brand-dark2/80 p-3.5 text-xs"
              >
                <p className="font-semibold text-brand-copperPale">{p.title}</p>
                <p className="mt-1 text-brand-mutedLight">{p.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-copper/25 pt-4 text-xs text-brand-mutedLight">
            <span>5 Revenue Streams: {REVENUE_STREAMS.map((s) => s.title).join(' · ')}</span>
            <span>Channels: {SOCIAL_CHANNELS.join(' · ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
