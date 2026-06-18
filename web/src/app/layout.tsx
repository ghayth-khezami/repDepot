import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ShopProvider } from "@/context/ShopContext";
import { AddToCartFxProvider } from "@/components/AddToCartFxProvider";
import { AppShell } from "@/components/AppShell";
import { AppToaster } from "@/components/AppToaster";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { defaultOpenGraph } from "@/lib/seo";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Boutique bébé par Mme Khezami`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: defaultOpenGraph("/", `${SITE_NAME} — Boutique bébé`, SITE_DESCRIPTION),
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ShopProvider>
          <AddToCartFxProvider>
            <AppShell>{children}</AppShell>
            <AppToaster />
          </AddToCartFxProvider>
        </ShopProvider>
      </body>
    </html>
  );
}
