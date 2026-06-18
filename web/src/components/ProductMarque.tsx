"use client";

import { api } from "@/lib/api";

export function ProductMarque({
  doc,
  className,
}: {
  doc?: string | null;
  className?: string;
}) {
  if (!doc) return null;
  const src = api.normalizePhotoUrl(doc);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className ?? "h-8 w-auto max-w-[5rem] object-contain"}
    />
  );
}
