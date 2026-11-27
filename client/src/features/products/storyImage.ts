import QRCode from 'qrcode';

/** Instagram story format. */
export const STORY_W = 1080;
export const STORY_H = 1920;

export type StoryTheme = 'rose' | 'violet' | 'creme';

export const STORY_THEMES: Record<StoryTheme, { label: string; bg: [string, string, string]; ink: string; sub: string; accent: string; pill: string; pillInk: string; swatch: string }> = {
  rose: { label: 'Rose', bg: ['#FFE4F1', '#FBCFE8', '#F9A8D4'], ink: '#4A1236', sub: '#9D174D', accent: '#DB2777', pill: '#BE185D', pillInk: '#FFFFFF', swatch: 'linear-gradient(135deg,#FFE4F1,#F9A8D4)' },
  violet: { label: 'Violet', bg: ['#4C1D95', '#6D28D9', '#DB2777'], ink: '#FFFFFF', sub: '#EDE9FE', accent: '#FBCFE8', pill: '#FFFFFF', pillInk: '#6D28D9', swatch: 'linear-gradient(135deg,#4C1D95,#DB2777)' },
  creme: { label: 'Crème', bg: ['#FFFBF5', '#FDF2E9', '#F5E6D8'], ink: '#2D2346', sub: '#7C5E4C', accent: '#E04672', pill: '#2D2346', pillInk: '#FFFFFF', swatch: 'linear-gradient(135deg,#FFFBF5,#F5E6D8)' },
};

export interface StoryProduct {
  name: string;
  priceMillimes: number;
  ref?: string | null;
  category?: string | null;
  photoUrl?: string | null;
  url: string;
  isDepot?: boolean;
}

const tnd = (m: number) => `${Math.floor(m / 1000)}.${String(Math.round(m % 1000)).padStart(3, '0')} TND`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wrap into at most `maxLines` lines (last one with "…"). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxW) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

/** Photo as a bitmap (CORS fetch). null → a soft placeholder is drawn instead. */
async function loadPhoto(url?: string | null): Promise<ImageBitmap | HTMLImageElement | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' }); // fresh copy: a cached <img> response may lack CORS headers
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    if ('createImageBitmap' in window) return await createImageBitmap(blob);
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap | HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const ih = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

/** Renders the story (1080×1920 PNG). */
export async function renderStory(p: StoryProduct, theme: StoryTheme): Promise<Blob> {
  const t = STORY_THEMES[theme];
  try {
    await document.fonts?.load('900 80px Nunito');
    await document.fonts?.load('700 40px Nunito');
  } catch {
    /* system font fallback */
  }
  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')!;
  const font = (weight: number, size: number) => `${weight} ${size}px Nunito, "Segoe UI", system-ui, sans-serif`;

  // Background
  const g = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
  g.addColorStop(0, t.bg[0]);
  g.addColorStop(0.55, t.bg[1]);
  g.addColorStop(1, t.bg[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  // soft blobs
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(980, 180, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, 1650, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Brand
  ctx.textAlign = 'center';
  ctx.fillStyle = t.ink;
  ctx.font = font(900, 64);
  ctx.fillText('BÉBÉ-DÉPÔT', STORY_W / 2, 150);
  ctx.fillStyle = t.sub;
  ctx.font = font(700, 34);
  ctx.fillText('by Mme Khezami', STORY_W / 2, 200);

  // Photo card
  const px = 110;
  const py = 260;
  const pw = STORY_W - 2 * px;
  const ph = pw;
  ctx.save();
  ctx.shadowColor = 'rgba(30, 27, 75, 0.28)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  roundRect(ctx, px, py, pw, ph, 56);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, px + 18, py + 18, pw - 36, ph - 36, 42);
  ctx.clip();
  const photo = await loadPhoto(p.photoUrl);
  if (photo) drawCover(ctx, photo, px + 18, py + 18, pw - 36, ph - 36);
  else {
    const pg = ctx.createLinearGradient(px, py, px + pw, py + ph);
    pg.addColorStop(0, '#F5F0FF');
    pg.addColorStop(1, '#FFE4F1');
    ctx.fillStyle = pg;
    ctx.fillRect(px, py, pw, ph);
    ctx.font = font(800, 220);
    ctx.textAlign = 'center';
    ctx.fillText('🧸', STORY_W / 2, py + ph / 2 + 80);
  }
  ctx.restore();

  // Badge on the photo
  const badge = p.isDepot ? 'SECONDE MAIN ♻' : 'NOUVEAUTÉ ✨';
  ctx.font = font(900, 32);
  const bw = ctx.measureText(badge).width + 56;
  roundRect(ctx, px + 44, py + 44, bw, 66, 33);
  ctx.fillStyle = t.accent;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(badge, px + 72, py + 89);

  // Name
  let y = py + ph + 110;
  ctx.textAlign = 'center';
  ctx.fillStyle = t.ink;
  ctx.font = font(900, 76);
  for (const line of wrap(ctx, p.name, STORY_W - 160, 2)) {
    ctx.fillText(line, STORY_W / 2, y);
    y += 88;
  }
  if (p.category) {
    ctx.fillStyle = t.sub;
    ctx.font = font(700, 38);
    ctx.fillText(p.category, STORY_W / 2, y - 18);
    y += 40;
  }

  // Price pill
  const price = tnd(p.priceMillimes);
  ctx.font = font(900, 84);
  const prw = ctx.measureText(price).width + 120;
  const pry = y + 10;
  ctx.save();
  ctx.shadowColor = 'rgba(30, 27, 75, 0.25)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, (STORY_W - prw) / 2, pry, prw, 132, 66);
  ctx.fillStyle = t.pill;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = t.pillInk;
  ctx.fillText(price, STORY_W / 2, pry + 96);

  // Bottom: QR + call to action
  const qrSize = 230;
  const by = STORY_H - qrSize - 150;
  roundRect(ctx, 110, by - 30, STORY_W - 220, qrSize + 60, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  const qr = await QRCode.toDataURL(p.url, { margin: 1, width: qrSize * 2, color: { dark: '#1E1B4B', light: '#FFFFFF' } });
  const qrImg = new Image();
  qrImg.src = qr;
  await qrImg.decode();
  ctx.drawImage(qrImg, 140, by, qrSize, qrSize);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E1B4B';
  ctx.font = font(900, 46);
  ctx.fillText('Disponible en ligne', 410, by + 70);
  ctx.font = font(700, 32);
  ctx.fillStyle = '#6B6889';
  ctx.fillText('Touchez le lien ou scannez', 410, by + 125);
  ctx.fillText('pour commander 💖', 410, by + 168);
  if (p.ref) {
    ctx.font = font(800, 28);
    ctx.fillStyle = '#9D174D';
    ctx.fillText(`Réf. ${p.ref}`, 410, by + 215);
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible'))), 'image/png'));
}
