/**
 * Business Profile Form (`MP` in Base44)
 * --------------------------------------
 * Used for both initial business creation ("List your business")
 * and editing in `/dashboard/profile`.
 */

import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Label,
  WorkingHoursEditor,
  ImageUpload,
} from '../ui';
import { CATEGORIES, defaultWorkingHours } from '../../lib/utils';
import type { ProviderRecord, WorkingHoursDay } from '../../../contracts';

const DEFAULT_VALUES = {
  name: '',
  category: 'Salon',
  tagline: '',
  about: '',
  phone: '',
  email: '',
  website: '',
  street: '',
  city: '',
  postcode: '',
  country: 'South Africa',
  cover_image: '',
};

export default function BusinessForm({
  initial,
  submitLabel = 'Save changes',
  onSubmit,
}: {
  initial?: Partial<ProviderRecord> | null;
  submitLabel?: string;
  onSubmit: (data: Partial<ProviderRecord>) => Promise<void>;
}) {
  const [fields, setFields] = useState(() => ({
    name: initial?.name ?? DEFAULT_VALUES.name,
    category: initial?.category ?? DEFAULT_VALUES.category,
    tagline: initial?.tagline ?? DEFAULT_VALUES.tagline,
    about: initial?.about ?? DEFAULT_VALUES.about,
    phone: initial?.phone ?? DEFAULT_VALUES.phone,
    email: initial?.email ?? DEFAULT_VALUES.email,
    website: initial?.website ?? DEFAULT_VALUES.website,
    street: initial?.street ?? DEFAULT_VALUES.street,
    city: initial?.city ?? DEFAULT_VALUES.city,
    postcode: initial?.postcode ?? DEFAULT_VALUES.postcode,
    country: initial?.country ?? DEFAULT_VALUES.country,
    cover_image: initial?.cover_image ?? DEFAULT_VALUES.cover_image,
  }));

  const [workingHours, setWorkingHours] = useState<WorkingHoursDay[]>(
    initial?.working_hours?.length ? initial.working_hours : defaultWorkingHours(),
  );
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof typeof DEFAULT_VALUES, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...fields,
        working_hours: workingHours,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg text-foreground">The basics</h2>
        <div>
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            required
            value={fields.name}
            onChange={(e) => setField('name', e.target.value)}
            className="mt-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={fields.category}
              onChange={(e) => setField('category', e.target.value)}
              className="mt-2 flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={fields.phone}
              onChange={(e) => setField('phone', e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tagline">Short tagline</Label>
          <Input
            id="tagline"
            value={fields.tagline}
            onChange={(e) => setField('tagline', e.target.value)}
            placeholder="What makes your place worth visiting"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="about">About</Label>
          <Textarea
            id="about"
            rows={4}
            value={fields.about}
            onChange={(e) => setField('about', e.target.value)}
            className="mt-2"
          />
        </div>
        <ImageUpload
          label="Cover photo"
          value={fields.cover_image}
          onChange={(url) => setField('cover_image', url)}
        />
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg text-foreground">Where to find you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="street">Street address</Label>
            <Input
              id="street"
              value={fields.street}
              onChange={(e) => setField('street', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={fields.city}
              onChange={(e) => setField('city', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={fields.postcode}
              onChange={(e) => setField('postcode', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={fields.country}
              onChange={(e) => setField('country', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="email">Contact email</Label>
            <Input
              id="email"
              value={fields.email}
              onChange={(e) => setField('email', e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={fields.website}
              onChange={(e) => setField('website', e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg text-foreground">Working hours</h2>
        <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="rounded-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
