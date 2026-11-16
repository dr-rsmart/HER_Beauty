/**
 * Platform Simulator Page (`/demo`)
 * ---------------------------------
 * Modeled after TimeTrack's Platform Simulator (`Demo.tsx`).
 * Allows the Platform Master to 1-click launch any persona (Master, Clinic Admin,
 * Salon Manager, Mechanic Manager, or Customer) and preview their experience.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Scissors,
  Wrench,
  User,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { masterApi } from '../services/api';
import { Button, Spinner } from '../components/ui';

const DEMO_PERSONAS = [
  {
    email: 'founder@herbeauty.co.za',
    label: 'Mrs Monean N Jacobs — Director & Master Governance',
    roleBadge: 'master (Director)',
    targetPath: '/master',
    description:
      'Executive oversight across all HER Beauty Western Cape studios, Young Stylist Programme metrics, studio onboarding & audit trail.',
    icon: ShieldCheck,
  },
  {
    email: 'admin@herbeauty.co.za',
    label: 'Chloe Laurent — Flagship Studio Manager',
    roleBadge: 'admin (Salon Director)',
    targetPath: '/dashboard',
    description:
      'Flagship studio director: manage 21 services across 5 revenue streams, 5 HER Pathway artisans, specials & contracts.',
    icon: Scissors,
  },
  {
    email: 'nomvula@herbeauty.co.za',
    label: 'Nomvula Dlamini — Master Stylist & Head Mentor',
    roleBadge: 'manager (EMPOWER Pathway)',
    targetPath: '/dashboard',
    description:
      'Master Texture Specialist & Senior Mentor (50% commission): manage chair schedule, Cohort 2025 mentorship hours, silk blowouts & loc rebalancing.',
    icon: Sparkles,
  },
  {
    email: 'tygervalley@herbeauty.co.za',
    label: 'Thabo Mokoena — Tygervalley Medical & Campus Hub',
    roleBadge: 'manager (Campus Hub)',
    targetPath: '/dashboard',
    description:
      'Tygerberg health-science campus studio manager: manage clinical-shift express blowouts, protective knotless braiding & open slots.',
    icon: Stethoscope,
  },
  {
    email: 'thandiwe@herbeauty.co.za',
    label: 'Thandiwe Ndlovu — HER Circle VIP Student Client',
    roleBadge: 'customer (HER Circle · 4,850 pts)',
    targetPath: '/my-bookings',
    description:
      'Client portal: browse studios, apply promo code, review 20% deposit & POPIA consent, and manage loyalty profile.',
    icon: User,
  },
];

export default function Demo() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleLaunch = async (email: string, targetPath: string) => {
    setLoadingEmail(email);
    try {
      const res = await masterApi.demoLogin(email);
      toast.success(res.message);
      await refresh();
      navigate(targetPath);
    } catch (err: any) {
      toast.error(err.message || 'Simulator launch failed');
    } finally {
      setLoadingEmail(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Operator Sandbox
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">Platform Simulator</h1>
        <p className="mt-1 text-muted-foreground">
          Simulate multi-tenant business owners and customer personas with one click.
        </p>
      </div>

      <div className="flex items-start gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <h4 className="font-display text-base text-foreground">
            Exclusive Operator Simulator Access
          </h4>
          <p className="mt-1 text-muted-foreground">
            In compliance with TimeTrack & BookingTrack security standards, quick-login demo
            accounts are hidden from the public login page and can only be launched from an
            authenticated Master Operator session.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {DEMO_PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isBusy = loadingEmail === persona.email;

          return (
            <div
              key={persona.email}
              className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground">{persona.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {persona.email} · <span className="text-primary">{persona.roleBadge}</span>
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{persona.description}</p>
              </div>

              <Button
                onClick={() => handleLaunch(persona.email, persona.targetPath)}
                disabled={loadingEmail !== null}
                className="mt-6 h-11 w-full rounded-full"
              >
                {isBusy ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 border-primary-foreground" />
                    Launching Persona…
                  </>
                ) : (
                  <>
                    Launch Persona <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
