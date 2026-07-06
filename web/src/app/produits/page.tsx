import { Suspense } from "react";
import { ProduitsPageClient } from "./ProduitsPageClient";

function ProduitsFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl bg-[#FFFDFB] px-4 py-6 text-[#2D2346] md:px-8 md:py-10 lg:px-10">
      <div className="mb-8 h-24 animate-pulse rounded-2xl bg-[#FFF0F4]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-[1.75rem] bg-[#FFF0F4]" />
        ))}
      </div>
    </div>
  );
}

export default function ProduitsPage() {
  return (
    <Suspense fallback={<ProduitsFallback />}>
      <ProduitsPageClient />
    </Suspense>
  );
}
