/**
 * Provider Dashboard Overview (`LP` and `FP` in Base44)
 * -----------------------------------------------------
 * If the signed-in user does not yet have a business, renders the
 * "For businesses — List your business" onboarding form.
 * Otherwise renders the Provider Dashboard with 4 KPI cards and Today's schedule.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CalendarCheck,
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  providersApi,
  bookingsApi,
  type BookingRecord,
} from '../../services/api';
import { useMyProvider } from '../../hooks/useMyProvider';
import { useAuth } from '../../context/AuthContext';
import { useSSE } from '../../hooks/useSSE';
import DashboardSubNav from '../../components/dashboard/DashboardSubNav';
import BusinessForm from '../../components/dashboard/BusinessForm';
import BookingRow from '../../components/dashboard/BookingRow';
import { Button, Skeleton, Spinner } from '../../components/ui';
import { getCategoryMeta, formatZAR } from '../../lib/utils';

function StatCard({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  Icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <p className="mt-3 font-display text-3xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DashboardOverview() {
  const { provider, setProvider, loading } = useMyProvider();
  const { refresh: refreshAuth } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<{
    todayCount: number;
    upcomingCount: number;
    pendingCount: number;
    revenue: number;
  } | null>(null);
  const [todayBookings, setTodayBookings] = useState<BookingRecord[]>([]);

  const loadStats = useCallback(async () => {
    if (!provider) return;
    try {
      const res = await bookingsApi.stats(provider.id);
      setStats({
        todayCount: res.todayCount,
        upcomingCount: res.upcomingCount,
        pendingCount: res.pendingCount,
        revenue: res.revenue,
      });
      setTodayBookings(res.todaySchedule);
    } catch {
      // ignore
    }
  }, [provider]);

  useEffect(() => {
    if (provider) {
      void loadStats();
    }
  }, [provider, loadStats]);

  useSSE(['booking:created', 'booking:updated', 'booking:reminder'], () => {
    void loadStats();
  });

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">For businesses</p>
        <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          List your business
        </h1>
        <p className="mt-3 text-muted-foreground">
          Publish your services, add the professionals customers can choose from, then open time
          slots. Bookings land straight in this dashboard.
        </p>
        <div className="mt-8">
          <BusinessForm
            submitLabel="Create my business"
            onSubmit={async (data) => {
              const created = await providersApi.create({
                ...data,
                status: 'published',
              });
              setProvider(created);
              await refreshAuth();
              toast.success(`"${created.name}" is now live on BookingTrack!`);
            }}
          />
        </div>
      </div>
    );
  }

  const { label: categoryLabel } = getCategoryMeta(provider.category);

  return (
    <div>
      <DashboardSubNav />
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
              Provider dashboard
            </p>
            <h1 className="mt-3 font-display text-3xl text-foreground">{provider.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {categoryLabel}
              {provider.city ? ` · ${provider.city}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => navigate(`/providers/${provider.id}`)}
            >
              View public page
            </Button>
            <Button
              className="rounded-full"
              onClick={() => navigate('/dashboard/availability')}
            >
              Add slots
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Today"
            value={stats ? stats.todayCount : '—'}
            hint="appointments booked"
            Icon={Calendar}
          />
          <StatCard
            label="Upcoming"
            value={stats ? stats.upcomingCount : '—'}
            hint="still to come"
            Icon={Clock}
          />
          <StatCard
            label="Awaiting confirmation"
            value={stats ? stats.pendingCount : '—'}
            hint="needs your attention"
            Icon={CalendarCheck}
          />
          <StatCard
            label="Completed revenue"
            value={stats ? formatZAR(stats.revenue) || 'R0' : '—'}
            hint="from finished appointments"
            Icon={Banknote}
          />
        </div>

        <h2 className="mt-12 font-display text-xl text-foreground">Today’s schedule</h2>
        <div className="mt-4 space-y-4">
          {!stats && <Skeleton className="h-32 rounded-2xl" />}
          {stats && todayBookings.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing booked for today. Open more slots in Availability, or share your public page.
            </p>
          )}
          {todayBookings.map((b) => (
            <BookingRow key={b.id} booking={b} onChange={() => void loadStats()} />
          ))}
        </div>
      </div>
    </div>
  );
}
