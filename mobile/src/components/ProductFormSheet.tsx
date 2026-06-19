import { useEffect, useState } from 'react';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import { useGetMarksQuery } from '../store/api/markApi';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  type CreateProductDto,
} from '../store/api/productApi';
import { createProductWithPhotos } from '../lib/uploadProduct';
import { BottomSheet } from './BottomSheet';
import {
  FieldLabel,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
} from './mobile-forms';
import { useToast } from '../context/ToastContext';
import type { Product, UpdateProductDto } from '../types';

type Props = {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductFormSheet({ product, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const { showToast } = useToast();
  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: 100 });
  const { data: coClients } = useGetCoClientsQuery({ page: 1, limit: 100 });
  const { data: marks } = useGetMarksQuery({ page: 1, limit: 100 });
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

  const [productName, setProductName] = useState(product?.productName ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [prixVente, setPrixVente] = useState(String(product?.PrixVente ?? ''));
  const [prixAchat, setPrixAchat] = useState(String(product?.PrixAchat ?? ''));
  const [stockQuantity, setStockQuantity] = useState(String(product?.stockQuantity ?? 1));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [coclientId, setCoclientId] = useState(product?.coclientId ?? '');
  const [markId, setMarkId] = useState(product?.markId ?? '');
  const [isDepot, setIsDepot] = useState(product?.isDepot ?? false);
  const [depotPercentage, setDepotPercentage] = useState(String(product?.depotPercentage ?? ''));
  const [isDispo, setIsDispo] = useState(product?.isDispo !== false);
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    if (product) {
      setProductName(product.productName);
      setDescription(product.description ?? '');
      setPrixVente(String(product.PrixVente));
      setPrixAchat(String(product.PrixAchat ?? ''));
      setStockQuantity(String(product.stockQuantity));
      setCategoryId(product.categoryId);
      setCoclientId(product.coclientId ?? '');
      setMarkId(product.markId ?? '');
      setIsDepot(product.isDepot);
      setDepotPercentage(String(product.depotPercentage ?? ''));
      setIsDispo(product.isDispo !== false);
    }
  }, [product]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !categoryId || !prixVente) {
      showToast('Nom, catégorie et prix vente requis', 'error');
      return;
    }
    try {
      if (isEdit && product) {
        const data: UpdateProductDto = {
          productName: productName.trim(),
          description: description.trim() || undefined,
          PrixVente: parseFloat(prixVente),
          PrixAchat: prixAchat ? parseFloat(prixAchat) : undefined,
          stockQuantity: parseInt(stockQuantity, 10) || 0,
          categoryId,
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
          coclientId: coclientId || undefined,
          isDepot,
          depotPercentage: isDepot && depotPercentage ? parseFloat(depotPercentage) : undefined,
        };
        if (photos.length > 0) {
          await createProductWithPhotos(
            { ...payload, markId: markId || undefined },
            photos,
          );
        } else {
          await createProduct(payload).unwrap();
        }
        showToast('Produit créé', 'success');
      }
      onSaved();
      onClose();
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  return (
    <BottomSheet title={isEdit ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <FieldLabel label="Nom *">
          <TextInput value={productName} onChange={(e) => setProductName(e.target.value)} required />
        </FieldLabel>
        <FieldLabel label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Prix vente (TND) *">
            <TextInput type="number" step="0.001" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} required />
          </FieldLabel>
          <FieldLabel label="Prix achat">
            <TextInput type="number" step="0.001" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
          </FieldLabel>
        </div>
        <FieldLabel label="Stock">
          <TextInput type="number" min={0} value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Catégorie *">
          <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Choisir…</option>
            {(categories?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.categoryName}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <FieldLabel label="Déposant (co-client)">
          <SelectInput value={coclientId} onChange={(e) => setCoclientId(e.target.value)}>
            <option value="">Aucun</option>
            {(coClients?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <FieldLabel label="Marque">
          <SelectInput value={markId} onChange={(e) => setMarkId(e.target.value)}>
            <option value="">Aucune</option>
            {(marks?.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </SelectInput>
        </FieldLabel>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDepot} onChange={(e) => setIsDepot(e.target.checked)} />
          Produit en dépôt
        </label>
        {isDepot ? (
          <FieldLabel label="% commission dépôt">
            <TextInput type="number" step="0.1" value={depotPercentage} onChange={(e) => setDepotPercentage(e.target.value)} />
          </FieldLabel>
        ) : null}
        {isEdit ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDispo} onChange={(e) => setIsDispo(e.target.checked)} />
            Disponible à la vente
          </label>
        ) : null}
        {!isEdit ? (
          <FieldLabel label="Photos (optionnel)">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="mt-1 w-full text-sm"
            />
          </FieldLabel>
        ) : null}
        <PrimaryButton type="submit" loading={creating || updating}>
          {isEdit ? 'Enregistrer' : 'Créer le produit'}
        </PrimaryButton>
      </form>
    </BottomSheet>
  );
}
