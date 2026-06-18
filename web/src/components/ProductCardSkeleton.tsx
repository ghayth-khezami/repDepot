export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-soft)]">
      <div className="aspect-[4/5] w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeletons({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}
