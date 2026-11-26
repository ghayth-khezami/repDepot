import { useMemo, useRef, useState } from 'react';
import { useGetCategoryHierarchyQuery } from '../../store/api/categoryApi';
import { useLazySearchDeposantsQuery, useSearchDeposantsQuery } from '../../store/api/depotApi';
import GuidedFlow, { categorySteps, type CategoryTree, type FlowStep, type FlowValues } from '../../components/GuidedFlow';
import { AiPill, useCategoryCreators } from '../../components/FormAssistant';
import { useAssistantGreeting } from '../../lib/greeting';
import { COMMISSION_VALUES } from '../../lib/commission';

export interface ProductAiResult {
  productName: string;
  isDepot: boolean;
  coClientId?: string;
  commission?: number;
  prixAchat?: number;
  prixVente: number;
  categoryId?: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
  description?: string;
}

/** Product-specific voice assistant: its own questions, in the order a product is actually entered. */
export default function ProductAssistant({ onApply }: { onApply: (r: ProductAiResult) => void }) {
  const [open, setOpen] = useState(false);
  const { data: categories } = useGetCategoryHierarchyQuery(undefined, { skip: !open });
  const treeRef = useRef<CategoryTree[]>([]);
  treeRef.current = (categories ?? []) as CategoryTree[];
  const { data: recent } = useSearchDeposantsQuery('', { skip: !open });
  const [searchDeposants] = useLazySearchDeposantsQuery();
  const creators = useCategoryCreators();
  const greeting = useAssistantGreeting('product', open);

  const steps = useMemo<FlowStep[]>(
    () => [
      { id: 'name', section: 'Produit', prompt: 'Quel est le nom du produit ?', hint: 'Ex. « Poussette Chicco grise »', kind: 'text' },
      {
        id: 'type',
        section: 'Produit',
        prompt: 'Il vient d’un achat ou d’un dépôt ?',
        hint: 'Achat = stock boutique · Dépôt = appartient à un déposant',
        kind: 'choice',
        options: () => [
          { value: 'achat', label: 'Achat' },
          { value: 'depot', label: 'Dépôt' },
        ],
      },
      {
        id: 'deposant',
        section: 'Dépôt',
        prompt: 'À quel déposant appartient-il ?',
        hint: 'Dites son nom ou son téléphone',
        kind: 'choice',
        when: (v) => v.type?.value === 'depot',
        options: () => (recent ?? []).map((d) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` })),
        resolve: async (spoken) => {
          const res = await searchDeposants(spoken.replace(/^(c'est|chez|de)\s+/i, '')).unwrap().catch(() => []);
          const d = res[0];
          return d ? { value: d.id, label: `${d.firstName} ${d.lastName} · N° ${d.number}` } : null;
        },
      },
      {
        id: 'commission',
        section: 'Dépôt',
        prompt: 'Quelle commission ?',
        hint: '« comme d’habitude » = 25 %',
        kind: 'percent',
        allowed: COMMISSION_VALUES,
        when: (v) => v.type?.value === 'depot',
        aliases: [{ match: /habitude|habituel|défaut|defaut|normal|standard/i, value: '25', display: '25 % (par défaut)' }],
      },
      { id: 'achat', section: 'Prix', prompt: 'Quel est le prix d’achat ?', hint: 'Ce que la boutique l’a payé', kind: 'price', when: (v) => v.type?.value === 'achat' },
      { id: 'vente', section: 'Prix', prompt: 'À quel prix le vendre ?', hint: 'Ex. « trois cent quatre-vingts dinars »', kind: 'price' },
      ...categorySteps({ tree: () => treeRef.current, section: 'Catégorie', ...creators }),
      { id: 'description', section: 'Détails', prompt: 'Une description ?', hint: 'État, taille, marque… « Passer » si aucune', kind: 'textarea', optional: true },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recent],
  );

  const done = (v: FlowValues) => {
    const num = (k: string) => (v[k]?.value ? Number(v[k]!.value.replace(',', '.')) : undefined);
    onApply({
      productName: v.name?.value ?? '',
      isDepot: v.type?.value === 'depot',
      coClientId: v.deposant?.value,
      commission: num('commission'),
      prixAchat: num('achat'),
      prixVente: num('vente') ?? 0,
      categoryId: v.category?.value,
      subCategoryId: v.sub?.value,
      subSubCategory1Id: v.subsub?.value,
      description: v.description?.value,
    });
    setOpen(false);
  };

  return (
    <>
      <AiPill onClick={() => setOpen(true)} label="Produit par IA" />
      {open ? <GuidedFlow title="Nouveau produit" greeting={greeting} steps={steps} doneLabel="Remplir la fiche produit" onDone={done} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
