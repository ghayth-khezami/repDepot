"use client";

import { useLocale } from "@/context/LocaleContext";
import type { Locale } from "@/i18n/messages";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex overflow-hidden rounded-full border border-border/70 text-xs font-semibold">
      {(["fr", "ar"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1.5 transition ${
            locale === code
              ? "text-cream"
              : "bg-card text-muted-foreground hover:text-foreground"
          }`}
          style={locale === code ? { background: "var(--gradient-brand)" } : undefined}
          aria-label={code === "fr" ? "Français" : "العربية"}
        >
          {code === "fr" ? t("langFr") : t("langAr")}
        </button>
      ))}
    </div>
  );
}
