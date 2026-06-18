import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { fetchCategory } from "@/lib/server-api";
import { defaultOpenGraph } from "@/lib/seo";

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const category = await fetchCategory(id);
  if (!category) return { title: `Catégorie — ${SITE_NAME}` };

  const title = `${category.categoryName} — ${SITE_NAME}`;
  const description =
    category.description?.slice(0, 160) ||
    `Découvrez nos produits ${category.categoryName} chez Bébé Dépôt.`;
  const path = `/categories/${id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: defaultOpenGraph(path, title, description),
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
