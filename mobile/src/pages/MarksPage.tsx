import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetMarksInfiniteQuery,
  useCreateMarkMutation,
  useUpdateMarkMutation,
  useDeleteMarkMutation,
  type Mark,
} from '../store/api/markApi';
import { uploadUrl } from '../lib/apiBase';
import { FormModal } from '../components/FormModal';
import { FileUploadBox } from '../components/FileUploadBox';
import { FieldLabel, TextInput, PrimaryButton, ItemActions, ListCard } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

export default function MarksPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<Mark | null>(null);
  const [name, setName] = useState('');
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [createMark, { isLoading: creating }] = useCreateMarkMutation();
  const [updateMark, { isLoading: updating }] = useUpdateMarkMutation();
  const [deleteMark] = useDeleteMarkMutation();
  const [, setRefresh] = useState(0);

  const openCreate = () => { setEdit(null); setName(''); setLogoFiles([]); setFormOpen(true); };
  const openEdit = (m: Mark) => { setEdit(m); setName(m.name); setLogoFiles([]); setFormOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const logoFile = logoFiles[0] ?? null;
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (logoFile) fd.append('logo', logoFile);
      if (edit) {
        if (!logoFile && !edit.logoDoc) {
          showToast('Logo requis', 'error');
          return;
        }
        await updateMark({ id: edit.id, body: fd }).unwrap();
        showToast('Marque modifiée', 'success');
      } else {
        if (!logoFile) { showToast('Logo requis', 'error'); return; }
        await createMark(fd).unwrap();
        showToast('Marque créée', 'success');
      }
      setFormOpen(false);
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (m: Mark) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${m.name} » ?`, destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteMark(m.id).unwrap();
      showToast('Supprimé', 'success');
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <PaginatedListPage<Mark>
        title="Marques"
        onAdd={openCreate}
        addLabel="Marque"
        useQuery={useGetMarksInfiniteQuery}
        renderItem={(m) => (
          <ListCard>
            {m.logoDoc ? (
              <img src={uploadUrl(m.logoDoc)} alt="" className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary-50" />
            )}
            <p className="min-w-0 flex-1 font-semibold">{m.name}</p>
            <ItemActions onEdit={() => openEdit(m)} onDelete={() => void remove(m)} />
          </ListCard>
        )}
      />
      {formOpen ? (
        <FormModal title={edit ? 'Modifier marque' : 'Nouvelle marque'} onClose={() => setFormOpen(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Nom *"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></FieldLabel>
            <FileUploadBox
              label="Logo *"
              files={logoFiles}
              onChange={setLogoFiles}
              existingUrls={edit?.logoDoc ? [uploadUrl(edit.logoDoc)] : []}
            />
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}
