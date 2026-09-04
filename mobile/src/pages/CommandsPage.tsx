import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useGetCommandsQuery,
  useGetCommandQuery,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  useCreateCommandMutation,
  type CreateCommandDto,
} from '../store/api/commandApi';
import { useGetClientsQuery } from '../store/api/clientApi';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { EmptyState, PageHeader, ListSkeleton } from '../components/ui';
import { ProductMultiSelect } from '../components/ProductMultiSelect';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { FieldLabel, TextInput, SelectInput, PrimaryButton, ItemActions } from '../components/mobile-forms';
import { FormModal } from '../components/FormModal';
import { formatTnd, uploadUrl } from '../lib/apiBase';
import type { Command, Product } from '../types';
import { PAGE_SIZE } from '../lib/pagination';

export default function CommandsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Command[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
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

  const { data: detail } = useGetCommandQuery(detailId!, { skip: !detailId });

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
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setDetailId(cmd.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{formatTnd(cmd.PrixVente)}</p>
                    <p className="text-xs text-gray-500">{cmd.productsNumber} article(s)</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{cmd.adresseLivraison}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${cmd.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                    {cmd.status === 'DELIVERED' ? 'Livré' : 'En attente'}
                  </span>
                </div>
              </button>
              <div className="mt-3 flex gap-2">
                <ItemActions onEdit={() => openEdit(cmd)} onDelete={() => void remove(cmd)} />
                <button type="button" onClick={() => void toggleDelivered(cmd)} className="flex-1 rounded-xl border border-primary-200 py-2 text-sm font-semibold text-primary-700">
                  {cmd.status === 'DELIVERED' ? 'Non livré' : 'Livré'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinelRef} className="h-8" />
      {detailId && detail ? (
        <FormModal title="Détail commande" onClose={() => setDetailId(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold">{formatTnd(detail.PrixVente)}</p>
              <p className="text-xs text-gray-500">{detail.productsNumber} article(s)</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase text-gray-500">Adresse livraison</p>
              <p className="mt-1 text-sm">{detail.adresseLivraison}</p>
            </div>
            {(() => {
              const client = (detail.commandDetails ?? []).find((item: any) => item.client)?.client;
              return client?.phoneNumber ? (
                <a href={`tel:${client.phoneNumber}`} className="flex w-full items-center justify-center rounded-xl bg-primary-600 py-3 font-semibold text-white">
                  Appeler {client.firstName}
                </a>
              ) : null;
            })()}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Produits</p>
              <ul className="space-y-2">
                {(detail.commandDetails ?? []).map((d: {
                  id: string;
                  product?: { id: string; productName: string; PrixVente: number; photos?: Array<{ photoDoc: string }> };
                }) => {
                  const p = d.product;
                  if (!p) return null;
                  const photo = p.photos?.[0]?.photoDoc;
                  return (
                    <li key={d.id} className="flex items-center gap-3 rounded-xl border border-primary-100 p-2 dark:border-slate-700">
                      {photo ? (
                        <img src={uploadUrl(photo)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-primary-50" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.productName}</p>
                        <p className="text-xs text-gray-500">{formatTnd(p.PrixVente)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </FormModal>
      ) : null}
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
                  <ProductMultiSelect selected={selectedProducts} onChange={setSelectedProducts} />
                </FieldLabel>
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
