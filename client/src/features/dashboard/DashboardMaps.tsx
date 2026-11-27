import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Maximize2, Minimize2, Store } from 'lucide-react';
import {
  useLazyGetCommandLocationsQuery,
  useLazyGetDepotLocationsQuery,
  type CommandLocation,
  type DepotLocation,
  type MapPage,
  type StatsQueryParams,
} from '../../store/api/statsApi';
import { orderIcon, personIcon } from '../../components/mapPins';
import { Card, CardTitle, EmptyState } from '../../components/ui';
import { formatTnd, toMillimes } from '../../lib/money';

const TUNISIA: [number, number] = [34.0, 9.0];
const tnd = (v?: number) => formatTnd(toMillimes(v ?? 0));

/* ───────────── Load every page, one after the other (progress shown) ───────────── */

function useAllPages<T>(load: (args: StatsQueryParams) => Promise<MapPage<T>>, args: StatsQueryParams) {
  const [state, setState] = useState<{ items: T[]; total: number; done: boolean; error: boolean }>({ items: [], total: 0, done: false, error: false });
  const key = JSON.stringify(args);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    let cancelled = false;
    setState({ items: [], total: 0, done: false, error: false });
    void (async () => {
      let page = 1;
      let totalPages = 1;
      const acc: T[] = [];
      try {
        do {
          const res = await loadRef.current({ ...JSON.parse(key), page, limit: 50 });
          if (cancelled) return;
          acc.push(...res.data);
          totalPages = res.meta.totalPages;
          setState({ items: [...acc], total: res.meta.total, done: page >= totalPages, error: false });
          page += 1;
        } while (page <= totalPages && !cancelled);
      } catch {
        if (!cancelled) setState((s) => ({ ...s, done: true, error: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}

/* ───────────── Geocoding (cached on this device, Nominatim 1 req/s) ───────────── */

const GEO_KEY = 'bd-geo-cache-v1';
function readGeo(): Record<string, [number, number] | null> {
  try {
    return JSON.parse(localStorage.getItem(GEO_KEY) || '{}');
  } catch {
    return {};
  }
}

function useGeocode(addresses: string[]) {
  const cache = useRef(readGeo());
  const [, tick] = useState(0);
  const sig = addresses.join('|');
  useEffect(() => {
    let cancelled = false;
    const todo = [...new Set(addresses.map((a) => a.trim()).filter((a) => a && !(a in cache.current)))];
    if (!todo.length) return;
    void (async () => {
      for (const addr of todo) {
        if (cancelled) return;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${addr}, Tunisia`)}`, { headers: { 'Accept-Language': 'fr' } });
          const json = await res.json();
          const lat = parseFloat(json?.[0]?.lat);
          const lon = parseFloat(json?.[0]?.lon);
          cache.current[addr] = Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
          try {
            localStorage.setItem(GEO_KEY, JSON.stringify(cache.current));
          } catch {
            /* storage full / blocked */
          }
          if (!cancelled) tick((t) => t + 1);
        } catch {
          /* offline: try again next time */
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return (address: string): [number, number] | null => cache.current[address.trim()] ?? null;
}

/* ───────────── Generic map card (fit, full screen, loading overlay) ───────────── */

interface Point {
  id: string;
  pos: [number, number];
  icon: L.DivIcon;
  popup: ReactNode;
}

function Fit({ points, full }: { points: Array<[number, number]>; full: boolean }) {
  const map = useMap();
  const sig = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 13 });
      else if (points.length === 1) map.setView(points[0], 12);
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sig, full]);
  return null;
}

function PointsMap({ points, full }: { points: Point[]; full: boolean }) {
  return (
    <MapContainer center={TUNISIA} zoom={6} style={{ height: '100%', width: '100%' }} className="z-0" scrollWheelZoom={full}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <Fit points={points.map((p) => p.pos)} full={full} />
      {points.map((p) => (
        <Marker key={p.id} position={p.pos} icon={p.icon}>
          <Popup>{p.popup}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function MapCard({
  title,
  icon,
  tone,
  points,
  loaded,
  total,
  done,
  legend,
  empty,
}: {
  title: string;
  icon: typeof MapPin;
  tone: 'green' | 'pink';
  points: Point[];
  loaded: number;
  total: number;
  done: boolean;
  legend: ReactNode;
  empty: ReactNode;
}) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full]);
  const pct = total ? Math.round((loaded / total) * 100) : done ? 100 : 5;

  return (
    <Card className="p-5 sm:p-6">
      <CardTitle icon={icon} tone={tone} title={title} subtitle={total ? `${total} sur la période` : undefined} />
      {done && !total ? (
        empty
      ) : (
        <>
          <div className="relative h-80 overflow-hidden rounded-2xl bg-bd-lilac/40 sm:h-[26rem]">
            {!full ? <PointsMap points={points} full={false} /> : null}
            {!done ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[450] rounded-2xl bg-white/95 p-3 shadow-card" role="status">
                <p className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-bd-ink">
                  <span className="bd-map-loader" aria-hidden /> Chargement de la carte… {loaded}/{total || '…'}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-bd-lilac">
                  <div className="h-full rounded-full bg-grad-pink-strong transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setFull(true)}
              className="bd-focus absolute right-3 top-3 z-[450] inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/95 px-3 text-sm font-extrabold text-bd-ink shadow-card active:scale-95"
            >
              <Maximize2 size={16} aria-hidden /> Plein écran
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold text-bd-muted">{legend}</div>
        </>
      )}
      {full
        ? createPortal(
            <div className="bd-ui fixed inset-0 z-[88] bg-bd-bg" role="dialog" aria-modal="true" aria-label={title}>
              <PointsMap points={points} full />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <div className="pointer-events-auto rounded-2xl bg-white/95 px-3 py-2 shadow-card">
                  <p className="text-sm font-extrabold text-bd-ink">{title} · {total}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-bd-muted">{legend}</div>
                </div>
                <button type="button" onClick={() => setFull(false)} className="bd-focus pointer-events-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-grad-pink-strong px-4 text-sm font-extrabold text-white shadow-glow-pink active:scale-95">
                  <Minimize2 size={16} aria-hidden /> Fermer
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </Card>
  );
}

const Dot = ({ cls, children }: { cls: string; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5">
    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${cls}`} /> {children}
  </span>
);

/* ───────────── The two dashboard maps ───────────── */

export default function DashboardMaps({ args, onSuivi }: { args: StatsQueryParams; onSuivi: (deposantId: string) => void }) {
  const [loadCommands] = useLazyGetCommandLocationsQuery();
  const [loadDepots] = useLazyGetDepotLocationsQuery();
  const commands = useAllPages<CommandLocation>((a) => loadCommands(a, true).unwrap(), args);
  const depots = useAllPages<DepotLocation>((a) => loadDepots(a, true).unwrap(), args);

  const geo = useGeocode(useMemo(() => [...commands.items.map((c) => c.address), ...depots.items.filter((d) => d.lat == null || d.lng == null).map((d) => d.address)], [commands.items, depots.items]));

  const commandPoints: Point[] = commands.items.flatMap((c) => {
    const pos = geo(c.address);
    if (!pos) return [];
    return [
      {
        id: c.id,
        pos,
        icon: orderIcon({ tone: c.surPlace ? 'violet' : 'pink', alert: c.pending ? 'pulse' : null }),
        popup: (
          <>
            <p className="text-sm font-bold">{c.client}</p>
            <p className="text-xs">{new Date(c.date).toLocaleDateString('fr-FR')} · {c.pending ? 'À traiter' : c.surPlace ? 'Vendu sur place' : 'Livrée'}</p>
            <p className="text-xs font-bold">{tnd(c.revenue)}</p>
            <p className="text-xs">{c.address}</p>
          </>
        ),
      },
    ];
  });

  const depotPoints: Point[] = depots.items.flatMap((d) => {
    const pos: [number, number] | null = d.lat != null && d.lng != null ? [d.lat, d.lng] : geo(d.address);
    if (!pos) return [];
    return [
      {
        id: d.id,
        pos,
        icon: personIcon(d.gender, d.deposant, d.ending ? 'red' : d.unpaid ? 'yellow' : null),
        popup: (
          <>
            <p className="text-sm font-bold">{d.deposant} · N° {d.number}</p>
            <p className="text-xs">{d.contractNumber} · {new Date(d.date).toLocaleDateString('fr-FR')}</p>
            <p className="text-xs font-bold">{d.items} article(s) · {tnd(d.value)}</p>
            {d.ending ? <p className="text-xs font-bold text-red-600">Contrat bientôt terminé{d.expiresAt ? ` (${new Date(d.expiresAt).toLocaleDateString('fr-FR')})` : ''}</p> : null}
            {d.unpaid ? <p className="text-xs font-bold text-amber-600">Articles vendus non payés</p> : null}
            <button type="button" onClick={() => onSuivi(d.deposantId)} className="mt-1 text-xs font-bold text-violet-700 underline">
              Voir le suivi
            </button>
          </>
        ),
      },
    ];
  });

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <MapCard
        title="Localisation des commandes"
        icon={MapPin}
        tone="green"
        points={commandPoints}
        loaded={commands.items.length}
        total={commands.total}
        done={commands.done}
        legend={
          <>
            <Dot cls="bd-legend-pulse bg-bd-pink">À traiter (non livrée)</Dot>
            <Dot cls="bg-bd-pink-strong">Livrée</Dot>
            <Dot cls="bg-bd-violet">Achat sur place</Dot>
          </>
        }
        empty={<EmptyState icon={MapPin} title="Aucune commande avec adresse sur la période" />}
      />
      <MapCard
        title="Localisation des dépôts"
        icon={Store}
        tone="pink"
        points={depotPoints}
        loaded={depots.items.length}
        total={depots.total}
        done={depots.done}
        legend={
          <>
            <Dot cls="bg-red-500">Contrat bientôt terminé</Dot>
            <Dot cls="bg-amber-400">Vendus non payés</Dot>
          </>
        }
        empty={
          <EmptyState icon={Store} title="Aucun dépôt localisé sur la période">
            Ajoutez l'adresse du déposant (ou sa position sur la carte) lors du dépôt.
          </EmptyState>
        }
      />
    </div>
  );
}
