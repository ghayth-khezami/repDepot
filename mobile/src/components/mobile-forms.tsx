import { Edit2, Trash2 } from 'lucide-react';

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800';

export function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ''}`} rows={props.rows ?? 3} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function PrimaryButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`w-full rounded-xl bg-primary-600 py-3 font-semibold text-white shadow-sm disabled:opacity-60 ${props.className ?? ''}`}
    >
      {loading ? 'En cours…' : children}
    </button>
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl border border-primary-200 py-3 font-semibold text-primary-700 dark:border-slate-600 dark:text-primary-300 ${props.className ?? ''}`}
    />
  );
}

export function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl border border-red-200 py-3 font-semibold text-red-600 dark:border-red-900 ${props.className ?? ''}`}
    />
  );
}

export function ItemActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {onEdit ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded-xl p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800"
          aria-label="Modifier"
        >
          <Edit2 size={18} />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-xl p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
          aria-label="Supprimer"
        >
          <Trash2 size={18} />
        </button>
      ) : null}
    </div>
  );
}

export function ListCard({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const className =
    'flex w-full items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 text-left shadow-sm dark:border-slate-700 dark:bg-slate-900';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }
  return <div className={className}>{children}</div>;
}
