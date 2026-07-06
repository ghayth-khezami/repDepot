"use client";

import { Headphones, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, text: "Livraison rapide partout en Tunisie" },
  { icon: ShieldCheck, text: "Produits sélectionnés avec soin" },
  { icon: Headphones, text: "Service client 7j/7" },
] as const;

export function AnnouncementBar() {
  return (
    <div className="hidden border-b border-[#8D6BFF]/8 bg-white/90 md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-10 px-6 py-2.5 text-xs text-[#2D2346]/65">
        {ITEMS.map(({ icon: Icon, text }) => (
          <span key={text} className="inline-flex items-center gap-2">
            <Icon size={14} className="text-[#8D6BFF]" strokeWidth={1.75} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
