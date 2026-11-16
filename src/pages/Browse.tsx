/**
 * Browse / Home Page (BookingTrack Foundation + HER Beauty Floor 1)
 * -----------------------------------------------------------------
 * Hero section with HER Beauty identity, live debounced search,
 * category filter pills, published HER Beauty Studio Branches grid,
 * Campus Specials & Promo Codes, The HER Pathway (LEARN -> PRACTISE -> EARN -> GROW -> EMPOWER),
 * and the Four Brand Pillars & Five Revenue Streams.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  Tag,
  Copy,
  GraduationCap,
  HeartHandshake,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  providersApi,
  herApi,
  type ProviderRecord,
  type SpecialOfferRecord,
  type PathwayMetricsResponse,
} from '../services/api';
import { Input, Skeleton, Badge, BrandLogo } from '../components/ui';
import { getCategoryMeta, cn } from '../lib/utils';
import {
  BRAND,
  FOUNDER,
  CONTACT,
  PATHWAY_STAGES,
  BRAND_PILLARS,
  REVENUE_STREAMS,
  BRAND_ASSOCIATIONS,
} from '../lib/brand';
import { useSSE } from '../hooks/useSSE';

const STUDIO_FILTERS = [
  { value: '', label: 'All HER Studios' },
  { value: 'Salon', label: 'Hair, Nails & Protective Styling' },
  { value: 'Spa & Wellness', label: 'Skin, Facials & Scalp Wellness' },
];

function ProviderCard({ provider }: { provider: ProviderRecord }) {
  const { Icon, label } = getCategoryMeta(provider.category);
  const locationText = [provider.city, provider.country].filter(Boolean).join(', ');
  const isFlagship =
    provider.billingTier === 'flagship' || provider.name.includes('Flagship');

  return (
    <Link
      to={`/providers/${provider.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-40px_rgba(158,85,64,0.45)]"
    >
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {provider.cover_image ? (
          <img
            src={provider.cover_image}
            alt={provider.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 via-background to-accent">
            <Icon className="h-9 w-9 text-primary/50" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </span>
          {isFlagship && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-copper px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-linen shadow-sm">
              <Crown className="h-3 w-3" /> Flagship
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-xl leading-tight text-foreground">{provider.name}</h3>
        {provider.tagline && (
          <p className="text-sm text-muted-foreground">{provider.tagline}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary/70" />
            {locationText || 'Western Cape, South Africa'}
          </p>
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            Book studio <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Browse() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [specials, setSpecials] = useState<SpecialOfferRecord[]>([]);
  const [pathwayMetrics, setPathwayMetrics] = useState<PathwayMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await providersApi.list({
        status: 'published',
        category: category || undefined,
        search: query.trim() || undefined,
        limit: 60,
      });
      setProviders(res.items);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  const fetchFloor1Data = useCallback(async () => {
    try {
      const [specRes, pathRes] = await Promise.all([
        herApi.listSpecials(),
        herApi.getPathwayMetrics(),
      ]);
      setSpecials(specRes.items);
      setPathwayMetrics(pathRes);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProviders();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchProviders]);

  useEffect(() => {
    void fetchFloor1Data();
  }, [fetchFloor1Data]);

  useSSE(['provider:created', 'provider:updated', 'special:created', 'special:deleted'], () => {
    void fetchProviders();
    void fetchFloor1Data();
  });

  const flagshipProvider =
    providers.find((p) => p.billingTier === 'flagship' || p.name.includes('Flagship')) ||
    providers[0] ||
    null;

  return (
    <div>
      {/* ── Hero Section (BookingTrack Foundation + HER Beauty Floor 1 Brand) ── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-accent/60" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {BRAND.slogan}
              </div>
              <h1 className="mt-4 font-display max-w-2xl text-4xl leading-[1.06] text-foreground sm:text-6xl">
                Beauty with Opportunity. Culturally Responsive Care.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Student and community-centred hair, nails & beauty studio and social enterprise at{' '}
                <strong className="font-medium text-foreground">HER Beauty Studio</strong> —
                blending natural hair wellness, knotless braiding, and{' '}
                <strong className="font-medium text-foreground">The HER Pathway</strong> youth
                development model.
              </p>

              <div className="relative mt-8 max-w-xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a HER studio, campus hub, service (e.g. Knotless Braids) or city…"
                  className="h-14 rounded-full border-border bg-card pl-11 text-base shadow-sm"
                />
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap pb-1">
                {STUDIO_FILTERS.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setCategory(f.value)}
                    className={cn(
                      'whitespace-nowrap rounded-full border px-4 py-2 text-sm transition shrink-0',
                      category === f.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                {flagshipProvider && (
                  <Link
                    to={`/providers/${flagshipProvider.id}/book`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-copper/40 bg-brand-copper/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-brand-copper hover:text-brand-linen"
                  >
                    Book Flagship Studio <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Founder & Brand Emblem Card */}
            <div className="luxury-gradient rounded-3xl border border-brand-copper/40 p-6 text-brand-linen shadow-2xl">
              <div className="flex items-center gap-4">
                <BrandLogo className="h-16 w-16" chip />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-brand-copperPale">
                    {BRAND.enterpriseName}
                  </p>
                  <h2 className="font-display text-2xl text-brand-linen">{BRAND.name}</h2>
                  <p className="text-xs text-brand-copperLight">{BRAND.identityLine}</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-brand-linen/85">
                “{BRAND.sloganExtended}”
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {BRAND_ASSOCIATIONS.map((assoc) => (
                  <span
                    key={assoc}
                    className="rounded-full border border-brand-copper/40 bg-brand-dark2 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-copperPale"
                  >
                    {assoc}
                  </span>
                ))}
              </div>
              <div className="mt-5 border-t border-brand-copper/25 pt-4 text-xs">
                <p className="font-semibold text-brand-linen">
                  {FOUNDER.name} · <span className="text-brand-copperPale">{FOUNDER.title}</span>
                </p>
                <p className="mt-0.5 text-brand-mutedLight">{CONTACT.address}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Published HER Beauty Studios & Campus Hubs Grid (BookingTrack Foundation) ── */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              Western Cape Network
            </p>
            <h2 className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
              {category ? `${category} Studios` : 'HER Beauty Studios & Campus Hubs'}
            </h2>
          </div>
          {!loading && (
            <p className="text-sm text-muted-foreground">{providers.length} studios taking bookings</p>
          )}
        </div>

        {loading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-display text-xl text-foreground">No studios matched your search</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing your filter or searching for another service or campus hub.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </section>

      {/* ── Floor 1: Campus Specials & Promo Codes ── */}
      {specials.length > 0 && (
        <section className="border-t border-border/60 bg-secondary/40 py-14">
          <div className="mx-auto w-full max-w-6xl px-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-primary">
                  <Tag className="h-3.5 w-3.5" /> Student & Campus Privileges
                </p>
                <h2 className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
                  Active Specials & Promo Codes
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Apply any promo code in Step 4 of the booking wizard
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {specials.slice(0, 3).map((sp) => (
                <div
                  key={sp.id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="default" className="rounded-full">
                        {sp.discountPercentage}% OFF
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(sp.code);
                          toast.success(`Copied promo code ${sp.code}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <Copy className="h-3 w-3" />
                        {sp.code}
                      </button>
                    </div>
                    <h3 className="mt-4 font-display text-lg text-foreground">{sp.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{sp.description}</p>
                  </div>
                  {flagshipProvider && (
                    <div className="mt-5 border-t border-border/60 pt-4">
                      <Link
                        to={`/providers/${flagshipProvider.id}/book`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Redeem at {flagshipProvider.name} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Floor 1: The HER Pathway (LEARN -> PRACTISE -> EARN -> GROW -> EMPOWER) ── */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="luxury-gradient rounded-3xl border border-brand-copper/40 p-8 text-brand-linen shadow-xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-brand-copperPale">
                <GraduationCap className="h-4 w-4" /> Social Impact Spine · Young Stylist Programme
              </p>
              <h2 className="mt-2 font-display text-2xl text-brand-linen sm:text-3xl">
                The HER Pathway: Learn → Practise → Earn → Grow → Empower
              </h2>
            </div>
            {pathwayMetrics && (
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full border border-brand-copper/40 bg-brand-dark2 px-3.5 py-1.5 text-brand-copperPale">
                  <strong className="text-brand-linen">{pathwayMetrics.youngStylistsInTraining}</strong>{' '}
                  Fellows in Training
                </span>
                <span className="rounded-full border border-brand-copper/40 bg-brand-dark2 px-3.5 py-1.5 text-brand-copperPale">
                  <strong className="text-brand-linen">
                    {pathwayMetrics.mentorshipHoursCompleted}h
                  </strong>{' '}
                  Mentorship Delivered
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PATHWAY_STAGES.map((item, idx) => (
              <div
                key={item.stage}
                className="rounded-2xl border border-brand-copper/30 bg-brand-dark2/90 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tracking-wider text-brand-copperLight">
                    0{idx + 1} · {item.stage}
                  </span>
                  {pathwayMetrics?.stageCounts?.[item.stage] != null && (
                    <span className="rounded-full bg-brand-copper/25 px-2 py-0.5 font-mono text-[10px] text-brand-copperPale">
                      {pathwayMetrics.stageCounts[item.stage]} artisans
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-brand-linen/80">{item.blurb}</p>
              </div>
            ))}
          </div>

          {/* 5 Revenue Streams & 4 Brand Pillars */}
          <div className="mt-8 grid gap-6 border-t border-brand-copper/25 pt-8 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-brand-copperPale">
                Five Integrated Revenue Streams
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {REVENUE_STREAMS.map((stream) => (
                  <div
                    key={stream.id}
                    className="rounded-xl border border-brand-copper/25 bg-brand-dark/60 px-3.5 py-2.5"
                  >
                    <p className="text-xs font-semibold text-brand-linen">{stream.title}</p>
                    <p className="text-[11px] text-brand-mutedLight">{stream.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-brand-copperPale">
                <HeartHandshake className="h-3.5 w-3.5" /> Four Brand Pillars
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {BRAND_PILLARS.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="rounded-xl border border-brand-copper/25 bg-brand-dark/60 px-3.5 py-2.5"
                  >
                    <p className="text-xs font-semibold text-brand-copperPale">{pillar.title}</p>
                    <p className="text-[11px] text-brand-mutedLight">{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
