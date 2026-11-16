const STAGE_STYLES: Record<string, string> = {
  LEARN: 'bg-brand-linen text-brand-muted border-brand-copperPale',
  PRACTISE: 'bg-brand-linen text-brand-muted border-brand-copperPale',
  EARN: 'bg-brand-linen text-brand-muted border-brand-copperPale',
  GROW: 'bg-brand-copper/15 text-brand-copper border-brand-copper/30',
  EMPOWER: 'bg-brand-copper/15 text-brand-copper border-brand-copper/30',
};

const STAGE_STYLES_DARK: Record<string, string> = {
  LEARN: 'bg-brand-dark2/70 text-brand-copperPale border-brand-copperPale/30',
  PRACTISE: 'bg-brand-dark2/70 text-brand-copperPale border-brand-copperPale/30',
  EARN: 'bg-brand-dark2/70 text-brand-copperPale border-brand-copperPale/30',
  GROW: 'bg-brand-copper/25 text-brand-copperLight border-brand-copper/50',
  EMPOWER: 'bg-brand-copper/25 text-brand-copperLight border-brand-copper/50',
};

interface PathwayBadgeProps {
  stage?: string | null;
  role?: string | null;
  dark?: boolean;
  className?: string;
}

export function PathwayBadge({
  stage,
  role,
  dark = false,
  className = '',
}: PathwayBadgeProps) {
  if (!stage && !role) return null;

  const palette = dark ? STAGE_STYLES_DARK : STAGE_STYLES;
  const key = stage ? stage.toUpperCase() : 'GROW';
  const tone = palette[key] || (dark ? STAGE_STYLES_DARK.GROW : STAGE_STYLES.GROW);

  return (
    <span
      title="The HER Pathway — Learn → Practise → Earn → Grow → Empower"
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${tone} ${className}`}
    >
      {stage && <span className="font-mono uppercase tracking-wider">{stage}</span>}
      {stage && role && <span className="opacity-40">•</span>}
      {role && <span className="font-medium normal-case">{role}</span>}
    </span>
  );
}

export default PathwayBadge;
