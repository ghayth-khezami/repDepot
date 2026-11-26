/**
 * Per-contract web app manifest: "Télécharger l'app" installs THIS déposant's tracking page
 * (start_url = /suivi/<token>) with the Bébé Dépôt icon.
 */
const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return new Response("Not found", { status: 404 });

  const manifest = {
    id: `/suivi/${token}`,
    name: "Mon dépôt — Bébé Dépôt",
    short_name: "Mon dépôt",
    description: "Suivez vos articles déposés et soyez prévenu(e) dès qu'ils sont vendus.",
    start_url: `/suivi/${token}?app=1`,
    scope: "/suivi/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F3FD",
    theme_color: "#6D28D9",
    lang: "fr",
    icons: [
      { src: "/suivi-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/suivi-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/suivi-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
