/**
 * Public Business Profile Page (`XT` in Base44)
 * ---------------------------------------------
 * Displays business cover image, category badge, tagline, About,
 * Services & rates, Our professionals, Visit us, and Working hours.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Sparkles,
} from 'lucide-react';
import {
  providersApi,
  servicesApi,
  professionalsApi,
  type ProviderRecord,
  type ServiceRecord,
  type ProfessionalRecord,
} from '../services/api';
import { Badge, Button, Skeleton, PathwayBadge } from '../components/ui';
import {
  getCategoryMeta,
  formatDuration,
  formatZAR,
  formatTime12,
  cn,
} from '../lib/utils';
import { REVENUE_STREAMS } from '../lib/brand';
import { useSSE } from '../hooks/useSSE';

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([]);
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [p, s, pro] = await Promise.all([
        providersApi.get(id),
        servicesApi.list({ provider_id: id, active: true, limit: 50 }),
        professionalsApi.list({ provider_id: id, active: true, limit: 50 }),
      ]);
      setProvider(p);
      setServices(s.items);
      setProfessionals(pro.items);
    } catch {
      setProvider(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useSSE(
    [
      'provider:updated',
      'service:created',
      'service:updated',
      'service:deleted',
      'professional:created',
      'professional:updated',
      'professional:deleted',
    ],
    () => {
      void loadData();
    },
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-10">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-foreground">This business isn’t available</h1>
        <p className="mt-3 text-muted-foreground">
          It may have been removed, or the link is out of date.
        </p>
        <Button className="mt-6 rounded-full" onClick={() => navigate('/')}>
          Back to browsing
        </Button>
      </div>
    );
  }

  const { Icon, label } = getCategoryMeta(provider.category);
  const fullAddress = [provider.street, provider.city, provider.postcode, provider.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All businesses
      </Link>

      <div className="relative mt-4 h-56 w-full overflow-hidden rounded-3xl bg-muted sm:h-72">
        {provider.cover_image ? (
          <img
            src={provider.cover_image}
            alt={provider.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 via-background to-accent">
            <Icon className="h-12 w-12 text-primary/40" />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {label}
          </Badge>
          <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
            {provider.name}
          </h1>
          {provider.tagline && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{provider.tagline}</p>
          )}
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto rounded-full"
          onClick={() => navigate(`/providers/${provider.id}/book`)}
        >
          <CalendarPlus className="mr-2 h-4 w-4" /> Book an appointment
        </Button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {provider.about && (
            <section>
              <h2 className="font-display text-xl text-foreground">About</h2>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{provider.about}</p>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">Services & rates</h2>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setStreamFilter('all')}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition',
                    streamFilter === 'all'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  All ({services.length})
                </button>
                {REVENUE_STREAMS.map((st) => {
                  const count = services.filter((s) => (s.stream || 'salon') === st.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStreamFilter(st.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition',
                        streamFilter === st.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {st.title} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {services.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Services are being updated — check back shortly.
                </p>
              )}
              {services
                .filter((s) => streamFilter === 'all' || (s.stream || 'salon') === streamFilter)
                .map((svc) => (
                  <div
                    key={svc.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/35"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{svc.name}</p>
                        {svc.popular && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            <Sparkles className="h-3 w-3" /> Popular
                          </span>
                        )}
                        {svc.category_name && (
                          <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                            {svc.category_name}
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{svc.description}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {formatDuration(svc.duration_minutes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display text-lg text-foreground">
                        {svc.price === 0 ? 'Complimentary' : formatZAR(svc.price) || 'Rate on request'}
                        {svc.price_note && svc.price !== 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {svc.price_note}
                          </span>
                        )}
                      </span>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() =>
                          navigate(`/providers/${provider.id}/book?service=${svc.id}`)
                        }
                      >
                        Book
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {professionals.length > 0 && (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="font-display text-xl text-foreground">Meet Our Artisans</h2>
                <span className="font-mono text-xs text-muted-foreground">
                  The HER Pathway: LEARN → PRACTISE → EARN → GROW → EMPOWER
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {professionals.map((pro) => (
                  <div
                    key={pro.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                        {pro.photo_url ? (
                          <img
                            src={pro.photo_url}
                            alt={pro.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-display text-lg text-primary">
                            {pro.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{pro.name}</p>
                        <PathwayBadge stage={pro.pathway_stage} role={pro.pathway_role || pro.title} />
                        {pro.rating && (
                          <p className="flex items-center gap-1 pt-0.5 text-xs text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <strong className="text-foreground">{pro.rating.toFixed(2)}</strong>
                            {pro.review_count ? ` (${pro.review_count} reviews)` : ''}
                            {pro.experience_years ? ` · ${pro.experience_years}y exp` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {pro.bio && <p className="text-sm text-muted-foreground">{pro.bio}</p>}

                    {pro.specialties && pro.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pro.specialties.map((sp) => (
                          <span
                            key={sp}
                            className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-secondary-foreground"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full"
                      onClick={() =>
                        navigate(`/providers/${provider.id}/book?professional=${pro.id}`)
                      }
                    >
                      Book with {pro.name.split(' ')[0]}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg text-foreground">Visit us</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {fullAddress && (
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" /> {fullAddress}
                </li>
              )}
              {provider.phone && (
                <li className="flex gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" /> {provider.phone}
                </li>
              )}
              {provider.email && (
                <li className="flex gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" /> {provider.email}
                </li>
              )}
              {provider.website && (
                <li className="flex gap-2.5">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" /> {provider.website}
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg text-foreground">Working hours</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {(provider.working_hours || []).map((wh) => (
                <li key={wh.day} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{wh.day}</span>
                  <span
                    className={
                      wh.closed ? 'text-muted-foreground/70' : 'text-foreground'
                    }
                  >
                    {wh.closed ? 'Closed' : `${formatTime12(wh.open)} – ${formatTime12(wh.close)}`}
                  </span>
                </li>
              ))}
              {!provider.working_hours?.length && (
                <li className="text-muted-foreground">Hours not published yet.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
