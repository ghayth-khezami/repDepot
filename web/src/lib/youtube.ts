/** Extract a YouTube video ID and return an embed URL, or null if invalid. */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const value = url.trim();

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/")[2];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}
