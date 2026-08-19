"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { MapPin } from "lucide-react";
import { getGoogleMapsOpenUrl, SOCIAL, STORE_EMAIL } from "@/lib/social";
import { api } from "@/lib/api";
import { fr, LOGO_SRC } from "@/lib/fr";

type FooterProps = {
  connected?: boolean;
};

export function Footer({ connected = false }: FooterProps) {
  const mapUrl = getGoogleMapsOpenUrl();
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  const onNewsletter = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    try {
      await api.subscribeNewsletter(email.trim());
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("err");
    }
  };

  return (
    <footer
      className={`relative z-[1] ${connected ? "home-footer-connected" : "mt-20 border-t border-border/50"}`}
      style={
        connected
          ? undefined
          : {
              background: "linear-gradient(180deg, var(--cream) 0%, oklch(0.95 0.025 300) 100%)",
            }
      }
    >
      <div className="page-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4 md:gap-12">
        <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Image
              src={LOGO_SRC}
              alt={fr.brand}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-contain"
            />
            <span className="display text-2xl text-gradient">{fr.brand}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{fr.footerAbout}</p>
        </div>

        <div className="space-y-4">
          <p className="tag-eyebrow">{fr.newsletterTitle}</p>
          <form onSubmit={onNewsletter} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={fr.newsletterPlaceholder}
              className="field-input min-w-0 flex-1"
            />
            <button type="submit" className="btn-primary shrink-0 px-5">
              {fr.newsletterSubmit}
            </button>
          </form>
          {status === "ok" && (
            <p className="text-sm text-primary">{fr.newsletterSuccess}</p>
          )}
          {status === "err" && (
            <p className="text-sm text-red-600">{fr.newsletterError}</p>
          )}
        </div>

        <div className="space-y-4">
          <p className="tag-eyebrow">{fr.followUs}</p>
          <div className="flex flex-wrap gap-3">
            {[
              { href: SOCIAL.instagram.href, label: "Instagram", logo: SOCIAL.instagram.logoSrc },
              { href: SOCIAL.facebook.href, label: "Facebook", logo: SOCIAL.facebook.logoSrc },
              { href: SOCIAL.whatsapp.href, label: "WhatsApp", logo: SOCIAL.whatsapp.logoSrc },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border bg-card transition hover:-translate-y-1 hover:border-primary"
                aria-label={s.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.logo} alt="" className="h-6 w-6 object-contain" />
              </a>
            ))}
            <a
              href={SOCIAL.tiktok.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border bg-card transition hover:-translate-y-1 hover:border-primary"
              aria-label="TikTok"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tiktok.png" alt="TikTok" className="h-7 w-7 object-contain" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {year} {fr.brand} — {fr.rights}
          </p>
        </div>

        <div className="glass-card space-y-3 p-6">
          <p className="tag-eyebrow">{fr.ourStore}</p>
          <p className="display text-2xl text-plum-deep">{fr.storeCity}</p>
          <Link
            href="/magasin"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {fr.visitStore}
          </Link>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <MapPin size={14} />
            {fr.seeRoute}
          </a>
          <a href={`mailto:${STORE_EMAIL}`} className="block text-sm text-primary underline-offset-4 hover:underline">{STORE_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
}
