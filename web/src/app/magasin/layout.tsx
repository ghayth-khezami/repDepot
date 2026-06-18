import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultOpenGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Notre magasin — ${SITE_NAME}`,
  description:
    "Horaires et adresse du magasin Bébé Dépôt à Manouba. Retrait et conseils Mme Khezami.",
  alternates: { canonical: "/magasin" },
  openGraph: defaultOpenGraph(
    "/magasin",
    `Magasin ${SITE_NAME}`,
    "Visitez notre boutique bébé à Manouba.",
  ),
};

export default function MagasinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
