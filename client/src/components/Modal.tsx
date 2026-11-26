import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FormAssistantButton } from './FormAssistant';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** true = generic "Remplir avec l'IA" for the form inside; a node = a form-specific assistant; false = none. */
  assistant?: boolean | ReactNode;
}

const Modal = ({ isOpen, onClose, title, children, size = 'md', assistant = true }: ModalProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const getRoot = useCallback(() => bodyRef.current, []);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  // Portal to <body>: never positioned against an animated/transformed page wrapper (no jump on open).
  // `.bo-page` keeps the legacy page button styles for forms inside.
  return createPortal(
    <div className="bo-page fixed inset-0 z-50 flex items-end justify-center bg-bd-ink/45 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bd-anim-fade-up max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-bd-surface shadow-2xl sm:rounded-[28px] ${sizeClasses[size]}`}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-bd-line/10 bg-bd-surface/95 px-5 py-4 backdrop-blur sm:px-6">
          <h2 className="min-w-0 flex-1 truncate text-lg font-black text-bd-ink sm:text-xl">{title}</h2>
          {assistant === true ? <FormAssistantButton getRoot={getRoot} title={title} /> : assistant || null}
          <span className="bd-ui contents">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="bd-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bd-muted transition hover:bg-bd-lilac/60 hover:text-bd-ink"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </span>
        </div>
        <div ref={bodyRef} className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-bd-ink sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
