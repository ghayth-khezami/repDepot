import { cn } from '../lib/cn';

export type Gender = 'F' | 'M' | null | undefined;

/**
 * Soft "3D" illustration of a woman / a man (gradients + highlights), one SVG string so it can be used
 * both in React and in Leaflet map pins. Unknown gender → neutral silhouette.
 */
export function personSvg(gender: Gender, px = 48): string {
  const g = gender === 'F' ? 'f' : gender === 'M' ? 'm' : 'n';
  const bg = g === 'f' ? ['#FDE2F3', '#F9A8D4'] : g === 'm' ? ['#DBEAFE', '#93C5FD'] : ['#EDE9FE', '#C4B5FD'];
  const top = g === 'f' ? ['#F472B6', '#DB2777'] : g === 'm' ? ['#60A5FA', '#2563EB'] : ['#A78BFA', '#7C3AED'];
  const hair = g === 'f' ? ['#7C4A2D', '#3F2416'] : ['#4B3621', '#24170C'];
  const id = `p${g}`;

  const hairBack =
    g === 'f'
      ? `<path d="M15 31c0-11 7-18 17-18s17 7 17 18v14c0 3-2 5-5 5H20c-3 0-5-2-5-5z" fill="url(#${id}h)"/>`
      : '';
  const hairFront =
    g === 'f'
      ? `<path d="M19 29c1-9 7-14 13-14 7 0 13 5 13 13-5-1-10-4-13-8-2 5-7 8-13 9z" fill="url(#${id}h)"/><circle cx="32" cy="12.5" r="5" fill="url(#${id}h)"/>`
      : g === 'm'
        ? `<path d="M19.5 28c-.5-9 5-14.5 12.5-14.5S45 18 44.5 28c-2-4-6-6.5-12.5-6.5S21.5 24 19.5 28z" fill="url(#${id}h)"/>`
        : `<path d="M20 28c0-8 5.5-13 12-13s12 5 12 13c-3-3-7-4.5-12-4.5S23 25 20 28z" fill="#6D28D9" opacity=".35"/>`;
  const extra =
    g === 'f'
      ? `<circle cx="22.6" cy="35.5" r="1.6" fill="#FBCFE8"/><circle cx="41.4" cy="35.5" r="1.6" fill="#FBCFE8"/>`
      : g === 'm'
        ? `<path d="M24 38c2 5 5 7 8 7s6-2 8-7c-2 1.5-5 2.2-8 2.2S26 39.5 24 38z" fill="url(#${id}h)" opacity=".55"/>`
        : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true">
<defs>
<radialGradient id="${id}b" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
<linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top[0]}"/><stop offset="1" stop-color="${top[1]}"/></linearGradient>
<radialGradient id="${id}s" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFE4D1"/><stop offset=".7" stop-color="#F6C3A0"/><stop offset="1" stop-color="#E7A57D"/></radialGradient>
<linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hair[0]}"/><stop offset="1" stop-color="${hair[1]}"/></linearGradient>
<clipPath id="${id}c"><circle cx="32" cy="32" r="30"/></clipPath>
</defs>
<circle cx="32" cy="32" r="30" fill="url(#${id}b)"/>
<g clip-path="url(#${id}c)">
${hairBack}
<path d="M10 66c0-12 9.5-19 22-19s22 7 22 19z" fill="url(#${id}t)"/>
<path d="M27 44h10v6c0 2.5-2.2 4-5 4s-5-1.5-5-4z" fill="#EDB48F"/>
<ellipse cx="32" cy="31" rx="12.5" ry="14" fill="url(#${id}s)"/>
${extra}
<circle cx="27.3" cy="32" r="1.5" fill="#3B2314"/><circle cx="36.7" cy="32" r="1.5" fill="#3B2314"/>
<path d="M28.5 38.2c2 1.8 5 1.8 7 0" stroke="#B4553A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
${hairFront}
<ellipse cx="25" cy="24" rx="6" ry="3" fill="#fff" opacity=".18"/>
</g>
<circle cx="32" cy="32" r="30" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
</svg>`;
}

/** Déposant avatar: woman / man illustration (or neutral). */
export default function PersonIllustration({ gender, size = 44, className, label }: { gender: Gender; size?: number; className?: string; label?: string }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0 rounded-full drop-shadow-[0_4px_8px_rgba(76,29,149,0.18)]', className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: personSvg(gender, size) }}
    />
  );
}

/** Femme / Homme picker shown right under Nom + Prénom. */
export function GenderPicker({ value, onChange }: { value: Gender; onChange: (g: 'F' | 'M') => void }) {
  return (
    <div role="radiogroup" aria-label="Illustration du déposant" className="grid grid-cols-2 gap-2">
      {(
        [
          ['F', 'Femme'],
          ['M', 'Homme'],
        ] as const
      ).map(([g, label]) => {
        const active = value === g;
        return (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(g)}
            className={cn(
              'bd-focus flex min-h-[64px] items-center gap-3 rounded-2xl border-2 px-3 text-left font-extrabold transition active:scale-[0.98]',
              active
                ? g === 'F'
                  ? 'border-bd-pink bg-bd-blush text-bd-pink-strong'
                  : 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                : 'border-bd-line/15 bg-bd-surface text-bd-ink',
            )}
          >
            <PersonIllustration gender={g} size={44} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
