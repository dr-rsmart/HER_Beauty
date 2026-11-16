import { BRAND, BRAND_ASSETS } from '../../lib/brand';

interface BrandLogoProps {
  className?: string;
  chip?: boolean;
}

/**
 * The one true HER logo — the full `her-logo-master.jpg` artwork, shown on its
 * own cream/linen background.
 */
export function BrandLogo({ className = 'w-10 h-10', chip = false }: BrandLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF6F0] ${
        chip ? 'ring-1 ring-brand-copper/40 shadow-sm' : ''
      } ${className}`}
    >
      <img
        src={BRAND_ASSETS.logo}
        alt={`${BRAND.name} logo`}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}

export default BrandLogo;
