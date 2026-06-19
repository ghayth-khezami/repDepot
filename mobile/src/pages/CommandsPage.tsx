import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useGetCommandsQuery,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  useCreateCommandMutation,
  type CreateCommandDto,
} from '../store/api/commandApi';
import { useGetClientsQuery } from '../store/api/clientApi';
import { useGetProductsQuery } from '../store/api/productApi';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { EmptyState, PageHeader, ListSkeleton, ProductPrice, ProductThumb } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { FieldLabel, TextInput, SelectInput, PrimaryButton, ItemActions } from '../components/mobile-forms';
import { FormModal } from '../components/FormModal';
import { formatTnd } from '../lib/apiBase';
import type { Command, Product } from '../types';
import { PAGE_SIZE } from '../lib/pagination';

export default function CommandsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Command[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editCmd, setEditCmd] = useState<Command | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [updateCommand] = useUpdateCommandMutation();
  const [deleteCommand] = useDeleteCommandMutation();
  const [createCommand, { isLoading: creating }] = useCreateCommandMutation();
  const { data: clients } = useGetClientsQuery({ page: 1, limit: PAGE_SIZE });

  const [clientId, setClientId] = useState('');
  const [adresse, setAdresse] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch, 350);
  const { data: productResults } = useGetProductsQuery(
    { page: 1, limit: 10, search: debouncedProductSearch || undefined },
    { skip: !formOpen || !!editCmd },
  );

  const filterKey = `${debouncedSearch}|${status}`;
  useEffect(() => { setPage(1); setItems([]); }, [filterKey]);

  const { data, isLoading, isFetching, refetch } = useGetCommandsQuery({
    page, limit: PAGE_SIZE, search: debouncedSearch || undefined, status: status || undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => page === 1 ? data.data : [...prev, ...data.data.filter((c) => !prev.some((i) => i.id === c.id))]);
  }, [data, page]);

  const hasMore = data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => { if (hasMore && !isFetching) setPage((p) => p + 1); }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

  const totals = useMemo(() => ({
    prixVente: selectedProducts.reduce((s, p) => s + p.PrixVente, 0),
    prixAchat: selectedProducts.reduce((s, p) => (p.isDepot ? s : s + (p.PrixAchat || 0)), 0),
    count: selectedProducts.length,
  }), [selectedProducts]);

  const openCreate = () => {
    if (formOpen) return;
    setEditCmd(null);
    setClientId('');
    setAdresse('');
    setSelectedProducts([]);
    setProductSearch('');
    setFormOpen(true);
  };

  const toggleDelivered = async (cmd: Command) => {
    const next = cmd.status === 'DELIVERED' ? 'NOT_DELIVERED' : 'DELIVERED';
    try {
      await updateCommand({ id: cmd.id, data: { status: next } }).unwrap();
      showToast(next === 'DELIVERED' ? 'Commande livrée' : 'En attente', 'success');
      void refetch();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const openEdit = (cmd: Command) => {
    setEditCmd(cmd);
    setAdresse(cmd.adresseLivraison);
    setFormOpen(true);
  };

  const toggleProduct = (p: Product) => {
    setSelectedProducts((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p],
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCmd) {
        await updateCommand({
          id: editCmd.id,
          data: { adresseLivraison: adresse },
        }).unwrap();
        showToast('Commande modifiée', 'success');
      } else {
        if (!clientId) {
          showToast('Client requis', 'error');
          return;
        }
        if (selectedProducts.length === 0) {
          showToast('Sélectionnez au moins un produit', 'error');
          return;
        }
        const payload: CreateCommandDto = {
          clientId,
          adresseLivraison: adresse,
          PrixVente: totals.prixVente,
          PrixAchat: totals.prixAchat,
          productsNumber: totals.count,
          productIds: selectedProducts.map((p) => p.id),
        };
        await createCommand(payload).unwrap();
        showToast('Commande créée', 'success');
      }
      setFormOpen(false);
      setEditCmd(null);
      void refetch();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (cmd: Command) => {
    const ok = await confirm({ title: 'Supprimer', message: 'Supprimer cette commande ?', destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteCommand(cmd.id).unwrap();
      showToast('Supprimée', 'success');
      void refetch();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const pickerProducts = (productResults?.data ?? []).filter(
    (p) => p.isDispo !== false && p.stockQuantity > 0,
  );

  return (
    <div className="pb-6">
      <PageHeader
        title="Commandes"
        subtitle={`${data?.meta.total ?? 0} au total`}
        onAdd={openCreate}
        addLabel="Commande"
        addDisabled={formOpen}
      />
      <div className="space-y-3 px-4">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900">
          <option value="">Tous les statuts</option>
          <option value="NOT_DELIVERED">Non livré</option>
          <option value="DELIVERED">Livré</option>
        </select>
      </div>

      {isLoading && page === 1 ? (
        <ListSkeleton count={4} withThumb={false} />
      ) : items.length === 0 ? (
        <EmptyState message="Aucune commande." />
      ) : (
        <ul className="mt-4 space-y-2 px-4">
          {items.map((cmd) => (
            <li key={cmd.id} className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatTnd(cmd.PrixVente)}</p>
                  <p className="text-xs text-gray-500">{cmd.productsNumber} article(s)</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{cmd.adresseLivraison}</p>
                </div>
                <ItemActions onEdit={() => openEdit(cmd)} onDelete={() => void remove(cmd)} />
              </div>
              <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase ${cmd.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                {cmd.status === 'DELIVERED' ? 'Livré' : 'En attente'}
              </span>
              <button type="button" onClick={() => void toggleDelivered(cmd)} className="mt-3 w-full rounded-xl border border-primary-200 py-2 text-sm font-semibold text-primary-700">
                {cmd.status === 'DELIVERED' ? 'Marquer non livré' : 'Marquer livré'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinelRef} className="h-8" />
      {formOpen ? (
        <FormModal title={editCmd ? 'Modifier commande' : 'Nouvelle commande'} onClose={() => setFormOpen(false)} busy={creating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            {!editCmd ? (
              <>
                <FieldLabel label="Client *">
                  <SelectInput value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                    <option value="">Choisir…</option>
                    {(clients?.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </SelectInput>
                </FieldLabel>
                <FieldLabel label="Produits *">
                  <TextInput
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Rechercher un produit…"
                  />
                </FieldLabel>
                {selectedProducts.length > 0 ? (
                  <ul className="space-y-2 rounded-xl border border-primary-100 bg-primary-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                    {selectedProducts.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <ProductThumb product={p} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.productName}</p>
                          <ProductPrice value={p.PrixVente} />
                        </div>
                        <button type="button" onClick={() => toggleProduct(p)} className="text-xs font-semibold text-red-600">Retirer</button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {pickerProducts.map((p) => {
                    const selected = selectedProducts.some((x) => x.id === p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => toggleProduct(p)}
                          className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left ${
                            selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-gray-200 dark:border-slate-700'
                          }`}
                        >
                          <ProductThumb product={p} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.productName}</p>
                            <ProductPrice value={p.PrixVente} />
                          </div>
                          <span className="text-xs font-bold">{selected ? '✓' : '+'}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-slate-800">
                  <p><strong>{totals.count}</strong> produit(s)</p>
                  <p>Total vente: <strong>{formatTnd(totals.prixVente)}</strong></p>
                  <p className="text-gray-500">Total achat: {formatTnd(totals.prixAchat)}</p>
                </div>
              </>
            ) : null}
            <FieldLabel label="Adresse livraison *"><TextInput value={adresse} onChange={(e) => setAdresse(e.target.value)} required /></FieldLabel>
            <PrimaryButton type="submit" loading={creating}>{editCmd ? 'Enregistrer' : 'Créer la commande'}</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </div>
  );
}
