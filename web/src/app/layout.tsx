import type { Metadata } from "next";
import { Cairo, Dancing_Script, Noto_Naskh_Arabic, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { ShopProvider } from "@/context/ShopContext";
import { AddToCartFxProvider } from "@/components/AddToCartFxProvider";
import { AppShell } from "@/components/AppShell";
import { AppToaster } from "@/components/AppToaster";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { defaultOpenGraph } from "@/lib/seo";
import { SOCIAL } from "@/lib/social";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-arabic-display",
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const script = Dancing_Script({
  variable: "--font-script",
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
  icons: {
    icon: "/depot.png",
    shortcut: "/depot.png",
    apple: "/depot.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${playfair.variable} ${poppins.variable} ${cairo.variable} ${notoNaskh.variable} ${script.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ShopProvider>
          <AddToCartFxProvider>
            <AppShell>{children}</AppShell>
            <AppToaster />
          </AddToCartFxProvider>
        </ShopProvider>
        {/* Organization structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              alternateName: "bebedepot",
              url: getSiteUrl(),
              email: "contact@bebedepot.tn",
              sameAs: [SOCIAL.instagram.href, SOCIAL.facebook.href, SOCIAL.tiktok.href, SOCIAL.whatsapp.href],
            }),
          }}
        />
      </body>
    </html>
  );
}
