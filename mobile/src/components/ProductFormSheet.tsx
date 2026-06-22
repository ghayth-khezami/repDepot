import { useEffect, useMemo, useState } from 'react';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  type CreateProductDto,
} from '../store/api/productApi';
import { useDeleteProductPhotoMutation } from '../store/api/productPhotoApi';
import { uploadProductPhotos } from '../lib/uploadProductPhotos';
import { FormModal } from './FormModal';
import { ProductPhotoPicker, MAX_PRODUCT_PHOTOS } from './ProductPhotoPicker';
import { ProductCategoryCascade, type CategorySelection } from './ProductCategoryCascade';
import {
  FieldLabel,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
  AchatDepotToggle,
} from './mobile-forms';
import { useToast } from '../context/ToastContext';
import { formatTnd, uploadUrl } from '../lib/apiBase';
import type { Product, UpdateProductDto } from '../types';
import { PAGE_SIZE } from '../lib/pagination';

type Props = {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
};

const emptyCategory: CategorySelection = {
  categoryId: '',
  subCategoryId: '',
  subSubCategory1Id: '',
  subSubCategory2Id: '',
  subSubCategory3Id: '',
};

export function ProductFormSheet({ product, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const { showToast } = useToast();
  const { data: coClients } = useGetCoClientsQuery({ page: 1, limit: PAGE_SIZE });
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deletePhoto] = useDeleteProductPhotoMutation();

  const [productName, setProductName] = useState(product?.productName ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [prixVente, setPrixVente] = useState(String(product?.PrixVente ?? ''));
  const [prixAchat, setPrixAchat] = useState(String(product?.PrixAchat ?? ''));
  const [stockQuantity] = useState(String(product?.stockQuantity ?? 1));
  const [categorySel, setCategorySel] = useState<CategorySelection>({
    categoryId: product?.categoryId ?? '',
    subCategoryId: product?.subCategoryId ?? '',
    subSubCategory1Id: product?.subSubCategory1Id ?? '',
    subSubCategory2Id: product?.subSubCategory2Id ?? '',
    subSubCategory3Id: product?.subSubCategory3Id ?? '',
  });
  const [coclientId, setCoclientId] = useState(product?.coclientId ?? '');
  const [mode, setMode] = useState<'achat' | 'depot'>(product?.isDepot ? 'depot' : 'achat');
  const [depotPercentage, setDepotPercentage] = useState(String(product?.depotPercentage ?? ''));
  const [isDispo, setIsDispo] = useState(product?.isDispo !== false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState('');

  const existingPhotos = (product?.photos ?? []).map((p) => ({
    id: p.id,
    url: uploadUrl(p.photoDoc),
  }));

  const keptExisting = existingPhotos.filter((p) => !removedPhotoIds.includes(p.id)).length;
  const totalPhotos = keptExisting + photos.length;

  const selectedDeposant = useMemo(
    () => (coClients?.data ?? []).find((c) => c.id === coclientId),
    [coClients, coclientId],
  );

  const prixVenteNum = parseFloat(prixVente) || 0;
  const commissionPct = parseFloat(depotPercentage) || 0;
  const bebeDepotAmount = prixVenteNum * (commissionPct / 100);
  const deposantAmount = Math.max(0, prixVenteNum - bebeDepotAmount);

  useEffect(() => {
    if (product) {
      setProductName(product.productName);
      setDescription(product.description ?? '');
      setPrixVente(String(product.PrixVente));
      setPrixAchat(String(product.PrixAchat ?? ''));
      setCategorySel({
        categoryId: product.categoryId,
        subCategoryId: product.subCategoryId ?? '',
        subSubCategory1Id: product.subSubCategory1Id ?? '',
        subSubCategory2Id: product.subSubCategory2Id ?? '',
        subSubCategory3Id: product.subSubCategory3Id ?? '',
      });
      setCoclientId(product.coclientId ?? '');
      setMode(product.isDepot ? 'depot' : 'achat');
      setDepotPercentage(String(product.depotPercentage ?? ''));
      setIsDispo(product.isDispo !== false);
      setPhotos([]);
      setRemovedPhotoIds([]);
    }
  }, [product]);

  const handleModeChange = (next: 'achat' | 'depot') => {
    setMode(next);
    if (next === 'achat') {
      setCoclientId('');
      setDepotPercentage('');
    } else {
      setPrixAchat('');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!productName.trim() || !categorySel.categoryId || !prixVente) {
      showToast('Nom, catégorie et prix de vente requis', 'error');
      return;
    }
    if (mode === 'depot') {
      if (!coclientId) {
        showToast('Sélectionnez un déposant', 'error');
        return;
      }
      if (!depotPercentage) {
        showToast('Commission % requise', 'error');
        return;
      }
    }
    if (totalPhotos > MAX_PRODUCT_PHOTOS) {
      showToast(`Maximum ${MAX_PRODUCT_PHOTOS} photos`, 'error');
      return;
    }

    const isDepot = mode === 'depot';
    const commonCategory = {
      categoryId: categorySel.categoryId,
      subCategoryId: categorySel.subCategoryId || undefined,
      subSubCategory1Id: categorySel.subSubCategory1Id || undefined,
      subSubCategory2Id: categorySel.subSubCategory2Id || undefined,
      subSubCategory3Id: categorySel.subSubCategory3Id || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit && product) {
        setSubmitPhase('Mise à jour…');
        if (removedPhotoIds.length > 0) {
          await Promise.all(removedPhotoIds.map((id) => deletePhoto(id).unwrap()));
        }
        if (photos.length > 0) {
          setSubmitPhase('Envoi des photos…');
          await uploadProductPhotos(product.id, photos);
        }
        const data: UpdateProductDto = {
          productName: productName.trim(),
          description: description.trim() || undefined,
          PrixVente: parseFloat(prixVente),
          PrixAchat: !isDepot && prixAchat ? parseFloat(prixAchat) : undefined,
          stockQuantity: parseInt(stockQuantity, 10) || 0,
          ...commonCategory,
          coclientId: isDepot ? coclientId : undefined,
          isDepot,
          depotPercentage: isDepot && depotPercentage ? parseFloat(depotPercentage) : undefined,
          isDispo,
        };
        await updateProduct({ id: product.id, data }).unwrap();
        showToast('Produit modifié', 'success');
      } else {
        const payload: CreateProductDto = {
          productName: productName.trim(),
          description: description.trim() || undefined,
          PrixVente: parseFloat(prixVente),
          PrixAchat: !isDepot && prixAchat ? parseFloat(prixAchat) : undefined,
          stockQuantity: parseInt(stockQuantity, 10) || 1,
          isDepot,
          depotPercentage: isDepot && depotPercentage ? parseFloat(depotPercentage) : undefined,
          coclientId: isDepot ? coclientId : undefined,
          ...commonCategory,
        };
        setSubmitPhase('Création…');
        const created = await createProduct(payload).unwrap();
        if (photos.length > 0) {
          setSubmitPhase('Envoi des photos…');
          await uploadProductPhotos(created.id, photos);
        }
        showToast('Produit créé', 'success');
      }
      onSaved();
      onClose();
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSubmitting(false);
      setSubmitPhase('');
    }
  };

  const deposantLabel = selectedDeposant
    ? `${selectedDeposant.firstName} ${selectedDeposant.lastName}`
    : 'Le déposant';

  return (
    <FormModal
      title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      onClose={onClose}
      busy={submitting}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <ProductPhotoPicker
          existing={existingPhotos}
          removedIds={removedPhotoIds}
          files={photos}
          onFilesChange={setPhotos}
          onRemoveExisting={(id) => setRemovedPhotoIds((prev) => [...prev, id])}
          onRestoreExisting={(id) => setRemovedPhotoIds((prev) => prev.filter((x) => x !== id))}
          disabled={submitting}
          uploading={submitting}
        />

        <FieldLabel label="Nom *">
          <TextInput value={productName} onChange={(e) => setProductName(e.target.value)} required disabled={submitting} />
        </FieldLabel>

        <FieldLabel label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
        </FieldLabel>

        <ProductCategoryCascade value={categorySel} onChange={setCategorySel} disabled={submitting} />

        <AchatDepotToggle mode={mode} onChange={handleModeChange} disabled={submitting} />

        {mode === 'achat' ? (
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Prix d'achat (TND)">
              <TextInput type="number" step="0.001" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} disabled={submitting} />
            </FieldLabel>
            <FieldLabel label="Prix de vente (TND) *">
              <TextInput type="number" step="0.001" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} required disabled={submitting} />
            </FieldLabel>
          </div>
        ) : (
          <div className="space-y-3">
            <FieldLabel label="Déposant *">
              <SelectInput value={coclientId} onChange={(e) => setCoclientId(e.target.value)} required disabled={submitting}>
                <option value="">Choisir un déposant…</option>
                {(coClients?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </SelectInput>
            </FieldLabel>
            <FieldLabel label="Prix de vente (TND) *">
              <TextInput type="number" step="0.001" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} required disabled={submitting} />
            </FieldLabel>
            <FieldLabel label="Commission % *">
              <TextInput type="number" step="0.1" min={0} max={100} value={depotPercentage} onChange={(e) => setDepotPercentage(e.target.value)} required disabled={submitting} />
            </FieldLabel>
            {prixVenteNum > 0 && commissionPct > 0 ? (
              <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-slate-800">
                <p className="font-medium text-red-600 dark:text-red-400">
                  {deposantLabel} aura {formatTnd(deposantAmount)}
                </p>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Bébé-Dépôt aura {formatTnd(bebeDepotAmount)}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {isEdit ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDispo} onChange={(e) => setIsDispo(e.target.checked)} disabled={submitting} />
            Disponible à la vente
          </label>
        ) : null}

        <PrimaryButton type="submit" loading={submitting}>
          {submitting ? (submitPhase || 'En cours…') : isEdit ? 'Enregistrer' : 'Créer le produit'}
        </PrimaryButton>
      </form>
    </FormModal>
  );
}
