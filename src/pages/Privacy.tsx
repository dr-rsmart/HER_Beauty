/**
 * Privacy Policy Page (`/privacy`)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { BRAND, FOUNDER, CONTACT } from '../lib/brand';

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {BRAND.name}
      </Link>
      <div className="flex items-center gap-2 text-primary">
        <Shield className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-widest">
          POPIA (Act 4 of 2013) & Booking Policy Governance
        </span>
      </div>
      <h1 className="font-display text-3xl text-foreground">
        {BRAND.enterpriseName} — Privacy & POPIA Policy
      </h1>
      <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">{BRAND.enterpriseName}</strong> (founded by{' '}
          {FOUNDER.name}, headquartered at {CONTACT.address}) processes personal information
          (name, contact email, phone number, appointment history, and voluntary hair texture,
          skin & allergy care notes) strictly for scheduling studio appointments and delivering
          culturally responsive care in accordance with the Protection of Personal Information
          Act (POPIA), 2013.
        </p>
        <p>
          Session tokens are stored in httpOnly cookies, passwords are hashed with bcrypt,
          special personal information consent is versioned and revocable, and immutable audit
          logs automatically redact client IP addresses.
        </p>
      </div>
    </div>
  );
}
