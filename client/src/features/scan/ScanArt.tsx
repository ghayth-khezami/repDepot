import { cn } from '../../lib/cn';

/** Mini QR drawn on the label targeted by the laser / camera. */
function MiniQr({ x, y, s }: { x: number; y: number; s: number }) {
  const c = s / 7;
  const cells = [
    [0, 0, 3], [4, 0, 3], [0, 4, 3], // finders
  ] as const;
  const dots = [[4, 4], [5, 5], [6, 4], [4, 6], [6, 6], [5, 3], [3, 5]];
  return (
    <g fill="#1E1B4B">
      {cells.map(([cx, cy, n]) => (
        <g key={`${cx}-${cy}`}>
          <rect x={x + cx * c} y={y + cy * c} width={n * c} height={n * c} rx={c * 0.4} />
          <rect x={x + cx * c + c * 0.55} y={y + cy * c + c * 0.55} width={n * c - c * 1.1} height={n * c - c * 1.1} rx={c * 0.25} fill="#fff" />
          <rect x={x + cx * c + c} y={y + cy * c + c} width={c} height={c} />
        </g>
      ))}
      {dots.map(([dx, dy]) => (
        <rect key={`${dx}-${dy}`} x={x + dx * c} y={y + dy * c} width={c} height={c} rx={c * 0.2} />
      ))}
    </g>
  );
}

/**
 * Handheld barcode scanner + its 2.4G USB receiver, laser on a QR label.
 *  - connected: green LED + receiver waves;
 *  - hit: the laser turns green and the label flashes (a code was just read).
 */
export function DouchetteArt({ connected, hit, className }: { connected: boolean; hit?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 260 160" className={cn('bd-scan-art', hit && 'is-hit', className)} role="img" aria-label="Douchette qui scanne une étiquette">
      <defs>
        <linearGradient id="dg-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B3363" />
          <stop offset="1" stopColor="#15112B" />
        </linearGradient>
      </defs>

      {/* USB receiver + waves */}
      <g className={connected ? 'text-emerald-400' : 'text-slate-400'}>
        <rect x="194" y="128" width="32" height="17" rx="4" fill="#CBD5E1" />
        <rect x="226" y="131" width="13" height="11" rx="2" fill="#94A3B8" />
        <rect x="199" y="132" width="9" height="9" rx="2" fill="currentColor" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${210 - 7 - i * 6} ${120 - i * 5} q${7 + i * 6} ${-9 - i * 5} ${14 + i * 12} 0`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="bd-art-wave"
            style={{ animationDelay: `${i * 0.25}s`, animationPlayState: connected ? 'running' : 'paused', opacity: connected ? undefined : 0.35 }}
          />
        ))}
      </g>

      {/* Label + QR */}
      <g className="bd-art-label">
        <rect x="196" y="28" width="56" height="64" rx="8" fill="#fff" stroke="#E9E3FF" strokeWidth="2" />
        <MiniQr x={206} y={36} s={36} />
        <rect x="206" y="77" width="36" height="4" rx="2" fill="#1E1B4B" opacity="0.8" />
        <rect x="212" y="84" width="24" height="3" rx="1.5" fill="#DB2777" />
      </g>

      {/* Laser fan + sweeping line */}
      <g className={cn('bd-art-laser transition-colors duration-300', hit ? 'text-emerald-400' : 'text-red-500')}>
        <polygon points="152,58 198,30 198,90" fill="currentColor" fillOpacity="0.28" className="bd-art-fan" />
        <line x1="152" y1="58" x2="198" y2="33" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        <line x1="152" y1="58" x2="198" y2="87" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        <rect x="194" y="32" width="62" height="3" rx="1.5" fill="currentColor" className="bd-art-line" />
      </g>

      {/* Scanner gun (floating) */}
      <g className="bd-art-float">
        <path d="M58 72 L92 72 L80 138 Q78 146 70 146 L54 146 Q46 146 47 138 Z" fill="url(#dg-body)" />
        <path d="M93 80 q10 3 7 17 q-5 -3 -11 -5 z" fill="#2A2450" />
        <rect x="34" y="36" width="118" height="42" rx="18" fill="url(#dg-body)" />
        <rect x="40" y="40" width="62" height="7" rx="3.5" fill="#fff" opacity="0.12" />
        <rect x="143" y="44" width="11" height="28" rx="4" className={cn('transition-colors duration-300', hit ? 'fill-emerald-400' : 'fill-red-500')} opacity="0.9" />
        <rect x="56" y="100" width="20" height="3" rx="1.5" fill="#fff" opacity="0.1" />
        <rect x="54" y="108" width="20" height="3" rx="1.5" fill="#fff" opacity="0.1" />
        <rect x="52" y="116" width="20" height="3" rx="1.5" fill="#fff" opacity="0.1" />
        <circle cx="58" cy="58" r="5" className={connected ? 'fill-emerald-400' : 'fill-slate-500'} />
        {connected ? <circle cx="58" cy="58" r="5" className="bd-art-led fill-emerald-400" /> : null}
        <text x="74" y="62" fontSize="10" fontWeight="900" fill="#fff" opacity="0.55" letterSpacing="2">
          SCAN
        </text>
      </g>

      {/* Read OK */}
      {hit ? (
        <g className="bd-anim-check" style={{ transformOrigin: '236px 30px' }}>
          <circle cx="236" cy="30" r="13" fill="#10B981" />
          <path d="M229 30 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </svg>
  );
}

/** Phone with its camera viewfinder framing a QR label. */
export function CameraArt({ className, available = true }: { className?: string; available?: boolean }) {
  return (
    <svg viewBox="0 0 260 160" className={cn('bd-scan-art', className)} role="img" aria-label="Téléphone qui scanne un QR code">
      <defs>
        <linearGradient id="cm-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E1065" />
          <stop offset="1" stopColor="#831843" />
        </linearGradient>
      </defs>
      {/* sparkles */}
      <g fill="#fff" className="bd-art-twinkle">
        <path d="M36 40 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" opacity="0.8" />
        <path d="M222 118 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" opacity="0.7" style={{ animationDelay: '0.8s' }} />
        <circle cx="214" cy="34" r="3" opacity="0.6" style={{ animationDelay: '1.4s' }} />
      </g>
      <g className="bd-art-float">
        <rect x="82" y="6" width="96" height="148" rx="20" fill="#15112B" />
        <rect x="89" y="16" width="82" height="128" rx="13" fill="url(#cm-screen)" />
        <rect x="118" y="10" width="24" height="4" rx="2" fill="#3B3363" />
        {/* label seen through the camera */}
        <rect x="104" y="44" width="52" height="60" rx="7" fill="#fff" />
        <MiniQr x={113} y={51} s={34} />
        <rect x="113" y="90" width="34" height="4" rx="2" fill="#1E1B4B" opacity="0.8" />
        {/* viewfinder corners */}
        <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" className="bd-art-corners">
          <path d="M98 50 v-12 h12" />
          <path d="M162 50 v-12 h-12" />
          <path d="M98 98 v12 h12" />
          <path d="M162 98 v12 h-12" />
        </g>
        {available ? <rect x="100" y="40" width="60" height="3" rx="1.5" fill="#F472B6" className="bd-art-camline" /> : null}
        <circle cx="130" cy="130" r="7" fill="#fff" opacity="0.9" />
      </g>
    </svg>
  );
}
