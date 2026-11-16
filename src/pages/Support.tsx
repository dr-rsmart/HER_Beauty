/**
 * Support Page (`/support`)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, Mail, Phone, MapPin } from 'lucide-react';
import { BRAND, FOUNDER, CONTACT } from '../lib/brand';

export default function Support() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {BRAND.name}
      </Link>
      <div className="flex items-center gap-2 text-primary">
        <LifeBuoy className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-widest">
          Concierge & Client Support
        </span>
      </div>
      <h1 className="font-display text-3xl text-foreground">{BRAND.name} Concierge Desk</h1>
      <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <p>
          Need help with an upcoming appointment, applying a promo code,
          enquiring about the <strong className="text-foreground">Young Stylist Programme</strong>,
          or booking a pop-up bar? Reach our concierge team:
        </p>
        <ul className="space-y-2.5 text-foreground">
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> {CONTACT.address}
          </li>
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> {CONTACT.email} · {FOUNDER.email}
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> {CONTACT.phone} ({CONTACT.hoursSummary})
          </li>
        </ul>
      </div>
    </div>
  );
}
