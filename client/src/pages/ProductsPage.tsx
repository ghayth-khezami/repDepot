import { useState, useEffect, useMemo } from 'react';
import {
  useGetProductsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '../store/api/productApi';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetSubCategoriesQuery } from '../store/api/subCategoryApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import InfiniteSelect from '../components/InfiniteSelect';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { Product, UpdateProductDto } from '../types';
import { Edit, Trash2, X, Upload, Eye, Package, Monitor, Smartphone, Heart, ShoppingCart } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useSearchParams } from 'react-router-dom';

const ProductsPage = () => {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isDepotFilter, setIsDepotFilter] = useState<boolean | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [photos, setPhotos] = useState<(string | File)[]>([]); // Can be base64 previews or File objects
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]); // Photos from server
  const [depotPercentage, setDepotPercentage] = useState<number>(0);
  const [surcharge, setSurcharge] = useState<number>(0);
  const [isDepot, setIsDepot] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [selectedCoClientId, setSelectedCoClientId] = useState<string>('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [previewMode, setPreviewMode] = useState<'web' | 'mobile'>('web');
  const [prefillName, setPrefillName] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetProductsQuery({
    page,
    limit,
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    isDepot: isDepotFilter,
  });
  // Category filter dropdown (always loaded, single page)
  const { data: filterCategoriesData } = useGetCategoriesQuery({ limit: 100, page: 1 });

  // Infinite scroll for categories (modal only)
  const [categoriesPage, setCategoriesPage] = useState(1);
  const { data: categoriesData, isLoading: categoriesLoading } = useGetCategoriesQuery(
    { limit: 10, page: categoriesPage },
    { skip: !isModalOpen },
  );
  const [allCategories, setAllCategories] = useState<any[]>([]);

  const [subsPage, setSubsPage] = useState(1);
  const { data: subsData, isLoading: subsLoading } = useGetSubCategoriesQuery(
    { limit: 10, page: subsPage, categoryId: selectedCategoryId || undefined },
    { skip: !selectedCategoryId || !isModalOpen },
  );
  const [allSubCategories, setAllSubCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setAllSubCategories([]);
      setSelectedSubCategoryId('');
      return;
    }
    setSubsPage(1);
    setAllSubCategories([]);
    setSelectedSubCategoryId('');
  }, [selectedCategoryId]);

  useEffect(() => {
    if (subsData?.data && selectedCategoryId) {
      setAllSubCategories((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        const next = subsData.data.filter((s) => !ids.has(s.id));
        return subsPage === 1 ? subsData.data : [...prev, ...next];
      });
    }
  }, [subsData, selectedCategoryId, subsPage]);

  // Infinite scroll for co-clients
  const [coClientsPage, setCoClientsPage] = useState(1);
  // Load co-clients only when product modal is open (avoid background fetch loops)
  const { data: coClientsData, isLoading: coClientsLoading } = useGetCoClientsQuery(
    { limit: 10, page: coClientsPage },
    { skip: !isModalOpen },
  );
  const [allCoClients, setAllCoClients] = useState<any[]>([]);

  // Accumulate categories
  useEffect(() => {
    if (categoriesData?.data) {
      setAllCategories((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newItems = categoriesData.data.filter((c) => !existingIds.has(c.id));
        return [...prev, ...newItems];
      });
    }
  }, [categoriesData]);

  // Accumulate co-clients
  useEffect(() => {
    if (coClientsData?.data) {
      setAllCoClients((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newItems = coClientsData.data.filter((c) => !existingIds.has(c.id));
        return [...prev, ...newItems];
      });
    }
  }, [coClientsData]);

  // Load initial data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setCategoriesPage(1);
      setCoClientsPage(1);
      setAllCategories([]);
      setAllCoClients([]);
      // Trigger initial load
      if (categoriesData?.data) {
        setAllCategories(categoriesData.data);
      }
      if (coClientsData?.data) {
        setAllCoClients(coClientsData.data);
      }
    }
  }, [isModalOpen]);

  // Set selected values when editing
  useEffect(() => {
    if (isModalOpen && selectedProduct) {
      setSelectedCategoryId(selectedProduct.categoryId || '');
      setSelectedSubCategoryId(selectedProduct.subCategoryId || '');
      setSelectedCoClientId(selectedProduct.coclientId || '');
      setIsDepot(selectedProduct.isDepot);
      setDepotPercentage(selectedProduct.depotPercentage || 0);
      setSurcharge((selectedProduct as any).surcharge || 0);
    } else if (isModalOpen && !selectedProduct) {
      setSelectedCategoryId('');
      setSelectedSubCategoryId('');
      setSelectedCoClientId('');
      setIsDepot(false);
      setDepotPercentage(0);
      setSurcharge(0);
    }
  }, [isModalOpen, selectedProduct]);
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedProduct(null);
    setPhotos([]);
    setExistingPhotos([]);
    setDepotPercentage(0);
    setSurcharge(0);
    setIsDepot(false);
    setSelectedCategoryId('');
    setSelectedCoClientId('');
    setPrefillName(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fromRequest = searchParams.get('fromRequest');
    if (!fromRequest) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const run = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/deposit-requests/${fromRequest}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Cannot load request');
        const req = await res.json();
        setIsEditMode(false);
        setSelectedProduct(null);
        setExistingPhotos([]);
        setDepotPercentage(0);
        setSurcharge(0);
        setIsDepot(true); // depot flow by default
        setSelectedCategoryId('');
        setSelectedCoClientId('');
        setPrefillName(String(req.fullName || ''));
        // Prefill photos: download blobs -> File[]
        const photoUrls: string[] = Array.isArray(req.photos) ? req.photos : [];
        const files: File[] = [];
        for (let i = 0; i < photoUrls.length; i++) {
          const p = photoUrls[i];
          const url = p.startsWith('http') ? p : `${apiBaseUrl}${p.startsWith('/') ? '' : '/'}${p}`;
          const b = await fetch(url);
          if (!b.ok) continue;
          const blob = await b.blob();
          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
          files.push(new File([blob], `request-${fromRequest}-${i + 1}.${ext}`, { type: blob.type }));
        }
        setPhotos(files);
        setIsModalOpen(true);
      } catch {
        // ignore
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, apiBaseUrl]);

  const handleView = (product: Product) => {
    setViewProduct(product);
    setPreviewMode('web');
    setViewModalOpen(true);
  };

  const handleEdit = async (product: Product) => {
    setIsEditMode(true);
    setSelectedProduct(product);
    setIsDepot(product.isDepot);
    setDepotPercentage(product.depotPercentage || 0);
    setSurcharge((product as any).surcharge || 0);
    setSelectedCategoryId(product.categoryId || '');
    setSelectedCoClientId(product.coclientId || '');
    setPhotos([]);
    setIsModalOpen(true);
    
    // Load existing photos for this product
    if (product.id) {
      try {
        const token = localStorage.getItem('token');
            const response = await fetch(`${apiBaseUrl}/product-photos/product/${product.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const photosData = await response.json();
          setExistingPhotos(photosData || []);
        }
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    }
  };

  const handleDelete = (id: string) => {
    confirm({
      title: 'Supprimer le produit',
      message: 'Êtes-vous sûr de vouloir supprimer ce produit ?',
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        await deleteProduct(id).unwrap();
        showToast('Produit supprimé avec succès', 'success');
      },
    });
  };

  const handleToggleAvailability = async (row: Product) => {
    try {
      const nextIsDispo = !(row.isDispo !== false);
      await updateProduct({
        id: row.id,
        data: {
          isDispo: nextIsDispo,
          stockQuantity: nextIsDispo ? Math.max(row.stockQuantity, 1) : 0,
        },
      });
      showToast(nextIsDispo ? 'Produit marque disponible' : 'Produit marque en rupture', 'success');
      await refetch();
    } catch {
      showToast('Erreur lors du changement de statut', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const { compressImagesForUpload } = await import('../lib/compressImage');
    const compressed = await compressImagesForUpload(Array.from(files));
    setPhotos((prev) => [...prev, ...compressed]);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (photoId: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const calculateEarnings = (prixVente: number, prixAchat: number, percentage: number) => {
    const profit = prixVente - prixAchat;
    const depotEarning = (profit * percentage) / 100;
    const coClientEarning = profit - depotEarning;
    return { depotEarning, coClientEarning, totalProfit: profit };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const baseData: any = {
      productName: formData.get('productName') as string,
      description: (formData.get('description') as string) || undefined,
      instagramLink: (formData.get('instagramLink') as string) || undefined,
      facebookLink: (formData.get('facebookLink') as string) || undefined,
      tiktokLink: (formData.get('tiktokLink') as string) || undefined,
      PrixVente: Number(formData.get('PrixVente')),
      stockQuantity: Number(formData.get('stockQuantity')),
      isDepot: isDepot,
      surcharge: surcharge || 0,
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId || undefined,
      coclientId: selectedCoClientId || undefined,
    };

    if (isDepot) {
      baseData.depotPercentage = depotPercentage;
    } else {
      baseData.PrixAchat = Number(formData.get('PrixAchat'));
    }

    try {
      let productId: string;
      if (isEditMode && selectedProduct) {
        await updateProduct({ id: selectedProduct.id, data: baseData as UpdateProductDto });
        productId = selectedProduct.id;
        showToast('Produit modifié avec succès', 'success');
      } else {
        const token = localStorage.getItem('token');
        const createFormData = new FormData();
        createFormData.append('productName', String(baseData.productName));
        if (baseData.description) createFormData.append('description', String(baseData.description));
        if (baseData.instagramLink) createFormData.append('instagramLink', String(baseData.instagramLink));
        if (baseData.facebookLink) createFormData.append('facebookLink', String(baseData.facebookLink));
        if (baseData.tiktokLink) createFormData.append('tiktokLink', String(baseData.tiktokLink));
        createFormData.append('PrixVente', String(baseData.PrixVente));
        if (baseData.PrixAchat !== undefined) createFormData.append('PrixAchat', String(baseData.PrixAchat));
        createFormData.append('stockQuantity', String(baseData.stockQuantity));
        createFormData.append('isDepot', String(baseData.isDepot));
        if (baseData.depotPercentage !== undefined) createFormData.append('depotPercentage', String(baseData.depotPercentage));
        createFormData.append('surcharge', String(baseData.surcharge || 0));
        if (baseData.coclientId) createFormData.append('coclientId', String(baseData.coclientId));
        createFormData.append('categoryId', String(baseData.categoryId));
        if (baseData.subCategoryId) createFormData.append('subCategoryId', String(baseData.subCategoryId));
        photos
          .filter((photo): photo is File => photo instanceof File)
          .forEach((file) => createFormData.append('photos', file));
        const createResponse = await fetch(`${apiBaseUrl}/products/with-photos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: createFormData,
        });
        if (!createResponse.ok) {
          throw new Error('Erreur lors de la création avec photos');
        }
        const result = await createResponse.json();
        productId = result.id;
        showToast('Produit créé avec succès', 'success');
      }

      // Upload photos as files to server/uploads
      if (isEditMode && photos.length > 0 && productId) {
        const token = localStorage.getItem('token');
        const files = photos.filter((photo): photo is File => photo instanceof File);
        const uploadFormData = new FormData();
        files.forEach((file) => uploadFormData.append('files', file));
        uploadFormData.append('productId', productId);

        const response = await fetch(`${apiBaseUrl}/product-photos/upload-multiple`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload product photos');
        }
        showToast('Photos téléchargées avec succès', 'success');
      }

      setIsModalOpen(false);
      setSelectedProduct(null);
      setPhotos([]);
      setExistingPhotos([]);
      setSurcharge(0);
      setDepotPercentage(0);
      setIsDepot(false);
      setPage(1);
      await refetch();
    } catch (error) {
      console.error('Error:', error);
      showToast('Erreur lors de l\'opération', 'error');
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    const baseUrl = apiBaseUrl;
    fetch(`${baseUrl}/products/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products.csv';
        a.click();
        showToast('Export CSV réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export CSV', 'error'));
  };

  const handleExportPdf = () => {
    const token = localStorage.getItem('token');
    const baseUrl = apiBaseUrl;
    fetch(`${baseUrl}/products/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products.pdf';
        a.click();
        showToast('Export PDF réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export PDF', 'error'));
  };

  const products = data?.data || [];

  const columns: Column<Product & { isSold?: boolean; photos?: any[] }>[] = [
    {
      header: 'Photo',
      accessor: (row) => {
        const firstPhoto = (row as any).photos?.[0]?.photoDoc;
        if (firstPhoto) {
          const baseUrl = apiBaseUrl;
          const photoUrl = firstPhoto.startsWith('http')
            ? firstPhoto
            : `${baseUrl}${firstPhoto.startsWith('/') ? '' : '/'}${firstPhoto}`;
          return (
            <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
              <img
                src={photoUrl}
                alt={row.productName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          );
        }
        return (
          <div className="h-12 w-12 bg-gray-200 flex items-center justify-center rounded-lg">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        );
      },
    },
    { header: 'Nom du produit', accessor: 'productName' },
    { header: 'Prix de vente', accessor: 'PrixVente', render: (value) => `${value} TND` },
    {
      header: 'Prix d\'achat',
      accessor: (row) => {
        if (row.isDepot) {
          return '-';
        }
        return `${row.PrixAchat || 0} TND`;
      },
    },
    {
      header: 'Dépôt',
      accessor: (row) => {
        if (row.isDepot && row.depotPercentage && row.gain !== null && row.gain !== undefined) {
          return `${row.gain} TND (${row.depotPercentage}%)`;
        }
        return '-';
      },
    },
    { header: 'Stock', accessor: 'stockQuantity' },
    {
      header: 'Statut',
      accessor: (row) => {
        const isDispo = row.isDispo !== false; // Default to true if undefined
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isDispo 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isDispo ? 'Disponible' : 'Rupture'}
          </span>
        );
      },
    },
    {
      header: 'Catégorie',
      accessor: (row) => row.category?.categoryName || '-',
    },
  ];

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, isDepotFilter, limit]);

  const formPrixVente = useMemo(() => {
    if (!isModalOpen) return '0';
    return (document.querySelector('input[name="PrixVente"]') as HTMLInputElement)?.value || '0';
  }, [isModalOpen]);
  const formPrixAchat = useMemo(() => {
    if (!isModalOpen) return '0';
    return (document.querySelector('input[name="PrixAchat"]') as HTMLInputElement)?.value || '0';
  }, [isModalOpen]);
  const earnings = calculateEarnings(
    Number(formPrixVente) || 0,
    Number(formPrixAchat) || 0,
    depotPercentage
  );
  const previewPhoto =
    viewProduct?.photos?.[0]?.photoDoc
      ? viewProduct.photos[0].photoDoc.startsWith('http')
        ? viewProduct.photos[0].photoDoc
        : `${apiBaseUrl}${viewProduct.photos[0].photoDoc.startsWith('/') ? '' : '/'}${viewProduct.photos[0].photoDoc}`
      : '';
  const previewOutOfStock = viewProduct ? viewProduct.isDispo === false || viewProduct.stockQuantity <= 0 : false;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Gestion des Produits</h1>
        <p className="bo-muted mt-2">Gérez tous les produits</p>
      </div>

      <ReusableTable
        data={products}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom ou description..."
        onSearch={setSearch}
        filters={
          <>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">Toutes les catégories</option>
              {(filterCategoriesData?.data ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
            <select
              value={isDepotFilter === undefined ? '' : isDepotFilter ? 'true' : 'false'}
              onChange={(e) => setIsDepotFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">Tous les dépôts</option>
              <option value="true">En dépôt</option>
              <option value="false">Pas en dépôt</option>
            </select>
          </>
        }
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                limit: data.meta.limit,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
                onLimitChange: (next) => {
                  setLimit(next);
                  setPage(1);
                },
              }
            : undefined
        }
        actions={(row) => (
          <>
            <button
              onClick={() => handleToggleAvailability(row)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                row.isDispo !== false
                  ? 'text-orange-600 hover:bg-orange-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={row.isDispo !== false ? 'Marquer en rupture' : 'Marquer disponible'}
            >
              {row.isDispo !== false ? 'Rupture' : 'Disponible'}
            </button>
            <button
              onClick={() => handleView(row)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-green-600 transition-colors hover:bg-green-50"
              title="Voir l'aperçu"
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Voir</span>
            </button>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        onAdd={handleAdd}
        addButtonLabel="Ajouter un produit"
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
          setPhotos([]);
        }}
        title={isEditMode ? 'Modifier le produit' : 'Ajouter un produit'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
            <input
              type="text"
              name="productName"
              defaultValue={selectedProduct?.productName || prefillName || ''}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              defaultValue={selectedProduct?.description}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (optionnel)</label>
              <input
                type="url"
                name="instagramLink"
                defaultValue={(selectedProduct as any)?.instagramLink || ''}
                placeholder="https://instagram.com/reel/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook (optionnel)</label>
              <input
                type="url"
                name="facebookLink"
                defaultValue={(selectedProduct as any)?.facebookLink || ''}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TikTok (optionnel)</label>
              <input
                type="url"
                name="tiktokLink"
                defaultValue={(selectedProduct as any)?.tiktokLink || ''}
                placeholder="https://tiktok.com/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
              <input
                type="number"
                name="stockQuantity"
                defaultValue={selectedProduct?.stockQuantity}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <InfiniteSelect
                items={allCategories}
                getOptionLabel={(cat) => cat.categoryName}
                getOptionValue={(cat) => cat.id}
                value={selectedCategoryId}
                onChange={(value) => setSelectedCategoryId(value as string)}
                onLoadMore={() => {
                  if (categoriesData?.meta && categoriesPage < categoriesData.meta.totalPages) {
                    setCategoriesPage((prev) => prev + 1);
                  }
                }}
                hasMore={categoriesData?.meta ? categoriesPage < categoriesData.meta.totalPages : false}
                isLoading={categoriesLoading}
                placeholder="Sélectionner une catégorie..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sous-catégorie</label>
            <InfiniteSelect
              items={allSubCategories}
              getOptionLabel={(s) => s.title}
              getOptionValue={(s) => s.id}
              value={selectedSubCategoryId}
              onChange={(value) => setSelectedSubCategoryId(value as string)}
              onLoadMore={() => {
                if (subsData?.meta && subsPage < subsData.meta.totalPages) {
                  setSubsPage((prev) => prev + 1);
                }
              }}
              hasMore={Boolean(selectedCategoryId && subsData?.meta && subsPage < subsData.meta.totalPages)}
              isLoading={subsLoading}
              placeholder={selectedCategoryId ? 'Sous-catégorie (optionnel)...' : 'Choisissez d\'abord une catégorie'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Déposant</label>
            <InfiniteSelect
              items={allCoClients}
              getOptionLabel={(coClient) => `${coClient.firstName} ${coClient.lastName}`}
              getOptionValue={(coClient) => coClient.id}
              value={selectedCoClientId}
              onChange={(value) => setSelectedCoClientId(value as string || '')}
              onLoadMore={() => {
                if (coClientsData?.meta && coClientsPage < coClientsData.meta.totalPages) {
                  setCoClientsPage((prev) => prev + 1);
                }
              }}
              hasMore={coClientsData?.meta ? coClientsPage < coClientsData.meta.totalPages : false}
              isLoading={coClientsLoading}
              placeholder="Sélectionner un co-client..."
            />
          </div>

          {/* Photos Upload - FIRST */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photos du produit</label>
            <div className="flex items-center gap-2 mb-2">
              <label className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Ajouter des photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Existing Photos from Server */}
            {existingPhotos.length > 0 && (
              <div className="mb-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Photos existantes:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {existingPhotos.map((photo) => {
                    const baseUrl = apiBaseUrl;
                    const photoUrl = photo.photoDoc.startsWith('http')
                      ? photo.photoDoc
                      : `${baseUrl}${photo.photoDoc.startsWith('/') ? '' : '/'}${photo.photoDoc}`;
                    return (
                      <div key={photo.id} className="relative">
                        <img
                          src={photoUrl}
                          alt={`Photo ${photo.id}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(photo.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* New Photos (File previews) */}
            {photos.length > 0 && (
              <div className="mb-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Nouvelles photos:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {photos.map((photo, index) => {
                    const photoUrl = photo instanceof File ? URL.createObjectURL(photo) : photo;
                    return (
                      <div key={index} className="relative">
                        <img
                          src={photoUrl}
                          alt={`Nouvelle photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (photo instanceof File) {
                              URL.revokeObjectURL(photoUrl);
                            }
                            removePhoto(index);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Toggle for Depot Mode */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isDepot}
                  onChange={(e) => setIsDepot(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-14 h-7 rounded-full transition-colors ${
                    isDepot ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                      isDepot ? 'translate-x-7' : 'translate-x-1'
                    } mt-0.5`}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">Mode Dépôt</span>
            </label>
          </div>

          {/* Price Fields - BELOW Photos */}
          {isDepot ? (
            // Depot Mode: Prix de vente + Percentage + Surcharge
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente (TND)</label>
                <input
                  type="number"
                  step="0.01"
                  name="PrixVente"
                  defaultValue={selectedProduct?.PrixVente}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage dépôt (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={depotPercentage}
                  onChange={(e) => setDepotPercentage(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surcharge (TND)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={surcharge}
                  onChange={(e) => setSurcharge(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            // Normal Mode: Prix de vente + Prix d'achat + Surcharge
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="PrixVente"
                    defaultValue={selectedProduct?.PrixVente}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="PrixAchat"
                    defaultValue={selectedProduct?.PrixAchat}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surcharge (TND)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={surcharge}
                  onChange={(e) => setSurcharge(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Hidden inputs for form submission */}
          <input type="hidden" name="categoryId" value={selectedCategoryId} />
          <input type="hidden" name="coclientId" value={selectedCoClientId} />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                // Clean up object URLs if any
                photos.forEach((photo) => {
                  if (photo instanceof File) {
                    URL.revokeObjectURL(URL.createObjectURL(photo));
                  }
                });
                setIsModalOpen(false);
                setSelectedProduct(null);
                setPhotos([]);
                setExistingPhotos([]);
                setSurcharge(0);
                setDepotPercentage(0);
                setIsDepot(false);
                setSelectedCategoryId('');
                setSelectedCoClientId('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewProduct(null);
        }}
        title="Aperçu du produit"
        size="xl"
      >
        {viewProduct && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-900">{viewProduct.productName}</div>
                <div className="text-sm text-gray-500">
                  {viewProduct.category?.categoryName || 'Sans catégorie'} • {viewProduct.PrixVente.toFixed(2)} TND
                </div>
              </div>
              <div className="inline-flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('web')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    previewMode === 'web' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  Web
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    previewMode === 'mobile' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 p-4">
              {previewMode === 'web' ? (
                <div className="mx-auto max-w-[430px] rounded-[34px] border border-white/70 bg-white p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)]">
                  <div className="relative h-[320px] overflow-hidden rounded-[28px] bg-[radial-gradient(ellipse_at_50%_35%,rgb(237,233,254)_0%,rgb(196,181,253)_42%,rgb(109,40,217)_94%)]">
                    {previewPhoto ? (
                      <img src={previewPhoto} alt={viewProduct.productName} className="h-full w-full object-cover object-center" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-white/80">Pas d'image</div>
                    )}
                    <div className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[#7c3aed]/35 text-white shadow backdrop-blur-md">
                      <Heart className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="-mt-10 rounded-[28px] bg-white px-5 pb-4 pt-3">
                    <div className="min-h-[3rem] text-[18px] font-black leading-tight text-slate-900">{viewProduct.productName}</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Prix</div>
                        <div className="whitespace-nowrap text-[2rem] font-black leading-none text-slate-900">
                          {viewProduct.PrixVente.toFixed(2)} <span className="text-sm font-bold text-slate-500">TND</span>
                        </div>
                      </div>
                      <div className="flex w-[160px] shrink-0 flex-col items-end gap-2">
                        <div className={`inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-white shadow-md ${
                          previewOutOfStock ? 'bg-slate-400' : 'bg-[#7b2cff]'
                        }`}>
                          <ShoppingCart className="h-4 w-4" />
                          {previewOutOfStock ? 'Indisponible' : 'Ajouter au panier'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex h-[448px] w-[280px] flex-col overflow-hidden rounded-[38px] border border-white/70 bg-white shadow-[0_24px_60px_-36px_rgba(0,0,0,0.55)]">
                  <div className="relative h-[314px] overflow-hidden rounded-t-[38px] bg-[radial-gradient(ellipse_at_50%_35%,rgb(237,233,254)_0%,rgb(196,181,253)_42%,rgb(109,40,217)_94%)]">
                    {previewPhoto ? (
                      <img src={previewPhoto} alt={viewProduct.productName} className="h-full w-full object-cover object-center" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-white/80">Pas d'image</div>
                    )}
                    <div className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-[#7c3aed]/35 text-white shadow backdrop-blur-md">
                      <Heart className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="-mt-10 flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white px-4 pb-3 pt-2.5">
                    <div className="min-h-[2.875rem] text-[13px] font-black leading-snug text-slate-900">{viewProduct.productName}</div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Prix</div>
                        <div className="whitespace-nowrap text-lg font-black text-slate-900">
                          {viewProduct.PrixVente.toFixed(2)} <span className="text-xs font-bold text-slate-500">TND</span>
                        </div>
                      </div>
                      <div className="flex w-[138px] shrink-0 flex-col items-end gap-1.5">
                        <div className={`inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-2xl px-2 py-2 text-[8.5px] font-black text-white shadow-md ${
                          previewOutOfStock ? 'bg-slate-400' : 'bg-[#7b2cff]'
                        }`}>
                          <ShoppingCart className="h-4 w-4" />
                          {previewOutOfStock ? 'Indisponible' : 'Ajouter au panier'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Stock</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewProduct.stockQuantity}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Statut</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{previewOutOfStock ? 'Rupture' : 'Disponible'}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Dépôt</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewProduct.isDepot ? 'Oui' : 'Non'}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Co-client</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {viewProduct.coClient ? `${viewProduct.coClient.firstName} ${viewProduct.coClient.lastName}` : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {dialog}
    </div>
  );
};

export default ProductsPage;
