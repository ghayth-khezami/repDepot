import L from 'leaflet';
import { personSvg, type Gender } from './PersonIllustration';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Shopping-bag "order" illustration (soft 3D gradients), as an SVG string. */
export function orderSvg(px = 44, tone: 'pink' | 'violet' = 'pink'): string {
  const [a, b] = tone === 'pink' ? ['#F472B6', '#DB2777'] : ['#A78BFA', '#6D28D9'];
  const id = `o${tone}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true">
<defs>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<ellipse cx="32" cy="58" rx="16" ry="3.5" fill="#1E1B4B" opacity=".18"/>
<path d="M22 22v-4a10 10 0 0 1 20 0v4" fill="none" stroke="${b}" stroke-width="4" stroke-linecap="round"/>
<path d="M12 22h40l-3.5 30a5 5 0 0 1-5 4.4H20.5a5 5 0 0 1-5-4.4z" fill="url(#${id}b)"/>
<path d="M12 22h40l-1 8H13z" fill="#fff" opacity=".18"/>
<path d="M15 24h14l-2 30h-7.5a4 4 0 0 1-4-3.5z" fill="url(#${id}s)"/>
<circle cx="24" cy="30" r="2.2" fill="#fff" opacity=".9"/><circle cx="40" cy="30" r="2.2" fill="#fff" opacity=".9"/>
<path d="M27 40c1.8 2.4 8.2 2.4 10 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</svg>`;
}

export type PinAlert = 'red' | 'yellow' | 'pulse' | null;

function wrap(inner: string, label?: string, alert?: PinAlert) {
  const ring = alert ? `<span class="bd-pin-alert bd-pin-alert--${alert}"></span>` : '';
  const name = label ? `<span class="bd-person-pin__name">${esc(label)}</span>` : '';
  return `<div class="bd-person-pin__wrap">${ring}${inner}${name}</div>`;
}

export function orderIcon(opts: { label?: string; alert?: PinAlert; tone?: 'pink' | 'violet' } = {}) {
  return L.divIcon({
    className: 'bd-person-pin',
    html: wrap(orderSvg(44, opts.tone), opts.label, opts.alert),
    iconSize: [60, 70],
    iconAnchor: [30, 60],
    popupAnchor: [0, -56],
  });
}

export function personIcon(gender: Gender, label?: string, alert?: PinAlert) {
  return L.divIcon({
    className: 'bd-person-pin',
    html: wrap(personSvg(gender, 46), label?.split(' ')[0], alert),
    iconSize: [60, 70],
    iconAnchor: [30, 62],
    popupAnchor: [0, -58],
  });
}
