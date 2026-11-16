/**
 * Provider Dashboard Sub-Navigation (`PP` in Base44)
 */

import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const DASHBOARD_TABS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/bookings', label: 'Bookings' },
  { to: '/dashboard/availability', label: 'Availability' },
  { to: '/dashboard/services', label: 'Services & Streams' },
  { to: '/dashboard/team', label: 'Artisans & Pathway' },
  { to: '/dashboard/specials', label: 'Specials & Comms' },
  { to: '/dashboard/contracts', label: 'Contracts & POPIA' },
  { to: '/dashboard/profile', label: 'Studio & Brand' },
];

export default function DashboardSubNav() {
  return (
    <div className="border-b border-border/60 bg-background/80 backdrop-blur">
      <nav className="no-scrollbar mx-auto flex w-full max-w-6xl gap-1.5 overflow-x-auto px-5 py-3">
        {DASHBOARD_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
