import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';
import { normalizeForField, setNativeValue } from '../lib/speech';
import { useCreateCategoryMutation } from '../store/api/categoryApi';
import { useCreateSubCategoryMutation } from '../store/api/subCategoryApi';
import { useCreateSubSubCategory1Mutation } from '../store/api/subSubCategoryApi';
import GuidedFlow, { type FlowOption, type FlowStep, type FlowValues } from './GuidedFlow';
import { useAssistantGreeting } from '../lib/greeting';

type FieldEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface FieldInfo {
  el: FieldEl;
  label: string;
  kind: FlowStep['kind'];
  options?: FlowOption[];
}

const SKIP_TYPES = ['hidden', 'file', 'submit', 'button', 'reset', 'radio', 'password', 'color', 'range', 'date', 'datetime-local', 'time', 'month', 'week', 'image'];

function cleanLabel(t: string | null | undefined) {
  return (t ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().replace(/[:：]$/, '');
}

function labelFor(el: FieldEl, root: HTMLElement) {
  if (el.id) {
    const l = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l?.textContent?.trim()) return cleanLabel(l.textContent);
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return cleanLabel(aria);
  const wrapping = el.closest('label');
  if (wrapping) {
    const clone = wrapping.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input,select,textarea,option').forEach((n) => n.remove());
    if (clone.textContent?.trim()) return cleanLabel(clone.textContent);
  }
  let node: HTMLElement | null = el.parentElement;
  for (let depth = 0; node && depth < 3; depth++, node = node.parentElement) {
    const l = node.querySelector('label');
    if (l && !l.contains(el) && l.textContent?.trim()) return cleanLabel(l.textContent);
  }
  return cleanLabel((el as HTMLInputElement).placeholder || el.getAttribute('name') || '');
}

/** Visible, editable fields of a form, in DOM order. */
export function collectFields(root: HTMLElement): FieldInfo[] {
  const out: FieldInfo[] = [];
  root.querySelectorAll<FieldEl>('input, textarea, select').forEach((el) => {
    if (el.disabled || (el as HTMLInputElement).readOnly) return;
    if (el.closest('[data-dictation="off"]') || el.closest('[data-assistant="off"]')) return;
    if (el instanceof HTMLInputElement && SKIP_TYPES.includes(el.type)) return;
    if (!el.getClientRects().length) return;
    const label = labelFor(el, root);
    if (!label) return;
    if (el instanceof HTMLSelectElement) {
      const options = Array.from(el.options)
        .filter((o) => o.value && !o.disabled)
        .map((o) => ({ value: o.value, label: o.text.trim() }));
      if (options.length) out.push({ el, label, kind: 'choice', options });
      return;
    }
    if (el instanceof HTMLTextAreaElement) return void out.push({ el, label, kind: 'textarea' });
    const kind: FlowStep['kind'] =
      el.type === 'checkbox'
        ? 'yesno'
        : el.type === 'email'
          ? 'email'
          : el.type === 'tel'
            ? 'tel'
            : el.type === 'number' || el.inputMode === 'decimal' || el.inputMode === 'numeric'
              ? 'number'
              : 'text';
    out.push({ el, label, kind });
  });
  return out;
}

/** Writes flow answers back into the real form inputs (React-controlled or not). */
function applyToFields(fields: FieldInfo[], values: FlowValues) {
  fields.forEach((f, i) => {
    const v = values[`f${i}`];
    if (!v) return;
    const el = f.el;
    if (f.kind === 'yesno') {
      const want = v.value === 'yes';
      if ((el as HTMLInputElement).checked !== want) (el as HTMLInputElement).click();
    } else if (el instanceof HTMLSelectElement) {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(el, v.value);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      setNativeValue(el, f.kind === 'number' ? v.value : normalizeForField(v.value, el));
    }
  });
}

/** Voice creation of categories / sub-categories, shared by the product and dépôt assistants. */
export function useCategoryCreators() {
  const [createCategory] = useCreateCategoryMutation();
  const [createSub] = useCreateSubCategoryMutation();
  const [createSubSub] = useCreateSubSubCategory1Mutation();
  return {
    createCategory: async (name: string): Promise<FlowOption> => {
      const c = await createCategory({ data: { categoryName: name } }).unwrap();
      return { value: c.id, label: c.categoryName };
    },
    createSub: async (name: string, categoryId: string): Promise<FlowOption> => {
      const s = await createSub({ title: name, categoryId }).unwrap();
      return { value: s.id, label: s.title };
    },
    createSubSub: async (name: string, subCategoryId: string): Promise<FlowOption> => {
      const s = await createSubSub({ title: name, subCategoryId }).unwrap();
      return { value: s.id, label: s.title };
    },
  };
}

/** The gradient "✨ Remplir avec l'IA" pill. */
export function AiPill({ onClick, label = "Remplir avec l'IA", className }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <span className="bd-ui contents">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'bd-focus group relative inline-flex min-h-[38px] shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-[linear-gradient(120deg,#6D28D9,#9333EA_55%,#DB2777)] px-3.5 text-sm font-extrabold text-white shadow-glow-violet transition active:scale-95',
          className,
        )}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] transition duration-700 group-hover:translate-x-full" />
        <Sparkles size={16} className="relative" aria-hidden />
        <span className="relative">{label}</span>
      </button>
    </span>
  );
}

/**
 * Generic assistant for any form: one question per field of *that* form (its own labels and lists),
 * then an editable review, then the answers are written into the form for a final check.
 */
export function FormAssistantButton({ getRoot, title }: { getRoot: () => HTMLElement | null; title: string }): ReactNode {
  const [fields, setFields] = useState<FieldInfo[] | null>(null);
  const [available, setAvailable] = useState(false);
  const greeting = useAssistantGreeting('generic', !!fields, title);

  useEffect(() => {
    const check = () => {
      const r = getRoot();
      setAvailable(!!r && collectFields(r).length >= 2);
    };
    const t = window.setTimeout(check, 60);
    const t2 = window.setTimeout(check, 700);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [getRoot]);

  const open = useCallback(() => {
    const r = getRoot();
    if (r) setFields(collectFields(r));
  }, [getRoot]);

  if (!available) return null;
  const steps: FlowStep[] =
    fields?.map((f, i) => ({
      id: `f${i}`,
      section: title,
      prompt: f.kind === 'choice' ? `${f.label} : lequel ?` : `${f.label} ?`,
      kind: f.kind,
      optional: !(f.el as HTMLInputElement).required,
      options: f.options ? () => f.options! : undefined,
    })) ?? [];
  return (
    <>
      <AiPill onClick={open} />
      {fields ? (
        <GuidedFlow
          title={title}
          greeting={greeting}
          steps={steps}
          onClose={() => setFields(null)}
          onDone={(values) => {
            applyToFields(fields, values);
            setFields(null);
          }}
        />
      ) : null}
    </>
  );
}
