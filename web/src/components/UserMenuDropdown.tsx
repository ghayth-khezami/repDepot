"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { fr } from "@/lib/fr";

export function UserMenuDropdown() {
  const router = useRouter();
  const { token, user, logout } = useShop();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!token) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground/80 transition hover:border-primary hover:text-primary"
        aria-label={fr.login}
      >
        <User size={17} strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground/80 transition hover:border-primary hover:text-primary"
        aria-label={fr.profile}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <User size={17} strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          className="user-menu-dropdown absolute right-0 top-[calc(100%+0.5rem)] z-[60] min-w-[11.5rem] overflow-hidden rounded-2xl border border-border/80 bg-card p-1.5 shadow-[var(--shadow-lift)]"
          role="menu"
        >
          {user?.email ? (
            <p className="truncate px-3 py-2 text-[11px] text-muted-foreground">{user.email}</p>
          ) : null}
          <Link
            href="/profile"
            role="menuitem"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <User size={16} strokeWidth={1.75} />
            {fr.profile}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[oklch(0.42_0.14_25)] transition hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              logout();
              router.push("/");
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            {fr.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}
