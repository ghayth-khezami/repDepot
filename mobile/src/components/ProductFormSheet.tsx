import { useEffect, useState } from 'react';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetSubCategoriesQuery } from '../store/api/subCategoryApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import { useGetMarksQuery } from '../store/api/markApi';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  type CreateProductDto,
} from '../store/api/productApi';
import { useDeleteProductPhotoMutation } from '../store/api/productPhotoApi';
import { createProductWithPhotos } from '../lib/uploadProduct';
import { uploadProductPhotos } from '../lib/uploadProductPhotos';
import { FormModal } from './FormModal';
import { ProductPhotoPicker, MAX_PRODUCT_PHOTOS } from './ProductPhotoPicker';
import {
  FieldLabel,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
} from './mobile-forms';
import { useToast } from '../context/ToastContext';
import { uploadUrl } from '../lib/apiBase';
import type { Product, UpdateProductDto } from '../types';
import { PAGE_SIZE } from '../lib/pagination';

type Props = {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductFormSheet({ product, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const { showToast } = useToast();
  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: 100 });
  const { data: coClients } = useGetCoClientsQuery({ page: 1, limit: PAGE_SIZE });
  const { data: marks } = useGetMarksQuery({ page: 1, limit: PAGE_SIZE });
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deletePhoto] = useDeleteProductPhotoMutation();

  const [productName, setProductName] = useState(product?.productName ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [prixVente, setPrixVente] = useState(String(product?.PrixVente ?? ''));
  const [prixAchat, setPrixAchat] = useState(String(product?.PrixAchat ?? ''));
  const [stockQuantity, setStockQuantity] = useState(String(product?.stockQuantity ?? 1));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [subCategoryId, setSubCategoryId] = useState(product?.subCategoryId ?? '');
  const [coclientId, setCoclientId] = useState(product?.coclientId ?? '');
  const [markId, setMarkId] = useState(product?.markId ?? '');
  const [isDepot, setIsDepot] = useState(product?.isDepot ?? false);
  const [depotPercentage, setDepotPercentage] = useState(String(product?.depotPercentage ?? ''));
  const [isDispo, setIsDispo] = useState(product?.isDispo !== false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: subCategories } = useGetSubCategoriesQuery(
    { page: 1, limit: 100, categoryId: categoryId || undefined },
    { skip: !categoryId },
  );

  const existingPhotos = (product?.photos ?? []).map((p) => ({
    id: p.id,
    url: uploadUrl(p.photoDoc),
  }));

  const keptExisting = existingPhotos.filter((p) => !removedPhotoIds.includes(p.id)).length;
  const totalPhotos = keptExisting + photos.length;

  useEffect(() => {
    if (product) {
      setProductName(product.productName);
      setDescription(product.description ?? '');
      setPrixVente(String(product.PrixVente));
      setPrixAchat(String(product.PrixAchat ?? ''));
      setStockQuantity(String(product.stockQuantity));
      setCategoryId(product.categoryId);
      setSubCategoryId(product.subCategoryId ?? '');
      setCoclientId(product.coclientId ?? '');
      setMarkId(product.markId ?? '');
      setIsDepot(product.isDepot);
      setDepotPercentage(String(product.depotPercentage ?? ''));
      setIsDispo(product.isDispo !== false);
      setPhotos([]);
      setRemovedPhotoIds([]);
    }
  }, [product]);

  useEffect(() => {
    if (!subCategoryId) return;
    const valid = (subCategories?.data ?? []).some((s) => s.id === subCategoryId);
    if (!valid) setSubCategoryId('');
  }, [categoryId, subCategories, subCategoryId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!productName.trim() || !categoryId || !prixVente) {
      showToast('Nom, catégorie et prix vente requis', 'error');
      return;
    }
    if (totalPhotos > MAX_PRODUCT_PHOTOS) {
      showToast(`Maximum ${MAX_PRODUCT_PHOTOS} photos`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && product) {
        for (const photoId of removedPhotoIds) {
          await deletePhoto(photoId).unwrap();
        }
        if (photos.length > 0) {
          await uploadProductPhotos(product.id, photos);
        }
        const data: UpdateProductDto = {
          productName: productName.trim(),
          description: description.trim() || undefined,
          PrixVente: parseFloat(prixVente),
          PrixAchat: prixAchat ? parseFloat(prixAchat) : undefined,
          stockQuantity: parseInt(stockQuantity, 10) || 0,
          categoryId,
          subCategoryId: subCategoryId || undefined,
          coclientId: coclientId || undefined,
          markId: markId || undefined,
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
          PrixAchat: prixAchat ? parseFloat(prixAchat) : undefined,
          stockQuantity: parseInt(stockQuantity, 10) || 1,
          categoryId,
          subCategoryId: subCategoryId || undefined,
          coclientId: coclientId || undefined,
          isDepot,
          depotPercentage: isDepot && depotPercentage ? parseFloat(depotPercentage) : undefined,
        };
        if (photos.length > 0) {
          await createProductWithPhotos(
            { ...payload, markId: markId || undefined, subCategoryId: subCategoryId || undefined },
            photos,
          );
        } else {
          await createProduct({ ...payload, markId: markId || undefined }).unwrap();
        }
        showToast('Produit créé', 'success');
      }
      onSaved();
      onClose();
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Prix vente (TND) *">
            <TextInput type="number" step="0.001" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} required disabled={submitting} />
          </FieldLabel>
          <FieldLabel label="Prix achat">
            <TextInput type="number" step="0.001" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} disabled={submitting} />
          </FieldLabel>
        </div>
        <FieldLabel label="Stock">
          <TextInput type="number" min={0} value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} disabled={submitting} />
        </FieldLabel>
        <FieldLabel label="Catégorie *">
          <SelectInput
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubCategoryId('');
            }}
            required
            disabled={submitting}
          >
            <option value="">Choisir…</option>
            {(categories?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.categoryName}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <FieldLabel label="Sous-catégorie">
          <SelectInput
            value={subCategoryId}
            onChange={(e) => setSubCategoryId(e.target.value)}
            disabled={submitting || !categoryId}
          >
            <option value="">{categoryId ? 'Aucune' : 'Choisir une catégorie d\'abord'}</option>
            {(subCategories?.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <FieldLabel label="Déposant (co-client)">
          <SelectInput value={coclientId} onChange={(e) => setCoclientId(e.target.value)} disabled={submitting}>
            <option value="">Aucun</option>
            {(coClients?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <FieldLabel label="Marque">
          <SelectInput value={markId} onChange={(e) => setMarkId(e.target.value)} disabled={submitting}>
            <option value="">Aucune</option>
            {(marks?.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDepot} onChange={(e) => setIsDepot(e.target.checked)} disabled={submitting} />
          Produit en dépôt
        </label>
        {isDepot ? (
          <FieldLabel label="% commission dépôt">
            <TextInput type="number" step="0.1" value={depotPercentage} onChange={(e) => setDepotPercentage(e.target.value)} disabled={submitting} />
          </FieldLabel>
        ) : null}
        {isEdit ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDispo} onChange={(e) => setIsDispo(e.target.checked)} disabled={submitting} />
            Disponible à la vente
          </label>
        ) : null}
        <PrimaryButton type="submit" loading={submitting}>
          {submitting ? 'En cours…' : isEdit ? 'Enregistrer' : 'Créer le produit'}
        </PrimaryButton>
      </form>
    </FormModal>
  );
}
