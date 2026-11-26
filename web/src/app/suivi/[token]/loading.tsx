function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-card bg-bd-lilac/70 ${className}`} />;
}

export default function SuiviLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10" aria-busy="true" aria-label="Chargement de vos articles">
      <div className="bg-gradient-to-br from-bd-lilac via-[#F3ECFD] to-bd-blush px-5 pb-24 pt-6 sm:rounded-b-[40px]">
        <Bone className="h-11 w-36 rounded-2xl" />
        <Bone className="mt-6 h-9 w-56" />
        <Bone className="mt-3 h-4 w-64" />
      </div>
      <div className="-mt-16 space-y-4 px-4">
        <Bone className="h-36 bg-white shadow-card" />
        <div className="grid grid-cols-3 gap-2.5">
          <Bone className="h-24" />
          <Bone className="h-24" />
          <Bone className="h-24" />
        </div>
        <Bone className="h-11 w-full rounded-full" />
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
