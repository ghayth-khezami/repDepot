import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { fetchMark, photoAbsoluteUrl } from "@/lib/server-api";
import { defaultOpenGraph } from "@/lib/seo";

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mark = await fetchMark(id);
  if (!mark) return { title: `Marque — ${SITE_NAME}` };

  const title = `${mark.name} — ${SITE_NAME}`;
  const description = `Produits de la marque ${mark.name} sur Bébé Dépôt.`;
  const path = `/marques/${id}`;
  const image = photoAbsoluteUrl(mark.logoDoc);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: defaultOpenGraph(path, title, description, image || undefined),
  };
}

export default function MarkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
