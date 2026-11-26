import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

/** Private pages: nothing personal in title / Open Graph, never indexed. */
export const metadata: Metadata = {
  title: "Suivi de dépôt",
  description: "Suivez vos articles déposés chez Bébé Dépôt.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: {
    title: "Suivi de dépôt — Bébé Dépôt",
    description: "Suivez vos articles déposés chez Bébé Dépôt.",
    type: "website",
  },
  twitter: { card: "summary", title: "Suivi de dépôt — Bébé Dépôt" },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#F7F3FD",
};

export default function SuiviLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${nunito.variable} suivi-root min-h-dvh`}>{children}</div>;
}
