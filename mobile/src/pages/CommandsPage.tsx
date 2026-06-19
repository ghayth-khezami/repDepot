import { useCallback, useEffect, useState } from 'react';
import {
  useGetCommandsQuery,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  useCreateCommandMutation,
  type CreateCommandDto,
} from '../store/api/commandApi';
import { useGetClientsQuery } from '../store/api/clientApi';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { EmptyState, PageHeader } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { FabAdd, FieldLabel, TextInput, SelectInput, PrimaryButton, ItemActions } from '../components/mobile-forms';
import { BottomSheet } from '../components/BottomSheet';
import { formatTnd } from '../lib/apiBase';
import type { Command } from '../types';
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
  const [prixVente, setPrixVente] = useState('');
  const [prixAchat, setPrixAchat] = useState('');
  const [productsNumber, setProductsNumber] = useState('1');

  const filterKey = `${debouncedSearch}|${status}`;
  useEffect(() => { setPage(1); setItems([]); }, [filterKey]);

  const { data, isLoading, isFetching, refetch } = useGetCommandsQuery({
    page, limit: PAGE_SIZE, search: debouncedSearch || undefined, status: status || undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => page === 1 ? data.data : [...prev, ...data.data.filter((c) => !items.some((i) => i.id === c.id))]);
  }, [data, page]);

  const hasMore = data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => { if (hasMore && !isFetching) setPage((p) => p + 1); }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

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
    setPrixVente(String(cmd.PrixVente));
    setPrixAchat(String(cmd.PrixAchat));
    setProductsNumber(String(cmd.productsNumber));
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCmd) {
        await updateCommand({
          id: editCmd.id,
          data: {
            adresseLivraison: adresse,
            PrixVente: parseFloat(prixVente),
            PrixAchat: parseFloat(prixAchat),
            productsNumber: parseInt(productsNumber, 10),
          },
        }).unwrap();
        showToast('Commande modifiée', 'success');
      } else {
        const payload: CreateCommandDto = {
          clientId,
          adresseLivraison: adresse,
          PrixVente: parseFloat(prixVente),
          PrixAchat: parseFloat(prixAchat) || 0,
          productsNumber: parseInt(productsNumber, 10) || 1,
          productIds: [],
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
    <div className="pb-24">
      <PageHeader title="Commandes" subtitle={`${data?.meta.total ?? 0} au total`} />
      <div className="space-y-3 px-4">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900">
          <option value="">Tous les statuts</option>
          <option value="NOT_DELIVERED">Non livré</option>
          <option value="DELIVERED">Livré</option>
        </select>
      </div>

      {isLoading && page === 1 ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune commande." /> : (
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
      <FabAdd onClick={() => { setEditCmd(null); setFormOpen(true); }} label="Commande" />
      {formOpen ? (
        <BottomSheet title={editCmd ? 'Modifier commande' : 'Nouvelle commande'} onClose={() => setFormOpen(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            {!editCmd ? (
              <FieldLabel label="Client *">
                <SelectInput value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                  <option value="">Choisir…</option>
                  {(clients?.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </SelectInput>
              </FieldLabel>
            ) : null}
            <FieldLabel label="Adresse livraison *"><TextInput value={adresse} onChange={(e) => setAdresse(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Prix vente *"><TextInput type="number" step="0.001" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Prix achat"><TextInput type="number" step="0.001" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} /></FieldLabel>
            <FieldLabel label="Nb articles"><TextInput type="number" min={1} value={productsNumber} onChange={(e) => setProductsNumber(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={creating}>Enregistrer</PrimaryButton>
          </form>
        </BottomSheet>
      ) : null}
    </div>
  );
}
