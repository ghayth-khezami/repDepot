import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useGetProductsInfiniteQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  CreateProductDto,
} from '../store/api/productApi';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import InfiniteSelect from '../components/InfiniteSelect';
import { useAddProductPhotosMutation, useGetProductPhotosQuery } from '../store/api/productPhotoApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import { Product, UpdateProductDto } from '../types';
import { Edit, Trash2, X, Upload, Eye, Package } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ProductsPage = () => {
  const [page, setPage] = useState(1);
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
  const [selectedCoClientId, setSelectedCoClientId] = useState<string>('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetProductsInfiniteQuery({
    page,
    search,
    categoryId: categoryFilter || undefined,
    isDepot: isDepotFilter,
  });
  // Infinite scroll for categories
  const [categoriesPage, setCategoriesPage] = useState(1);
  const { data: categoriesData, isLoading: categoriesLoading } = useGetCategoriesQuery({ limit: 10, page: categoriesPage });
  const [allCategories, setAllCategories] = useState<any[]>([]);

  // Infinite scroll for co-clients
  const [coClientsPage, setCoClientsPage] = useState(1);
  const { data: coClientsData, isLoading: coClientsLoading } = useGetCoClientsQuery({ limit: 10, page: coClientsPage });
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
      setSelectedCoClientId(selectedProduct.coclientId || '');
      setIsDepot(selectedProduct.isDepot);
      setDepotPercentage(selectedProduct.depotPercentage || 0);
      setSurcharge((selectedProduct as any).surcharge || 0);
    } else if (isModalOpen && !selectedProduct) {
      setSelectedCategoryId('');
      setSelectedCoClientId('');
      setIsDepot(false);
      setDepotPercentage(0);
      setSurcharge(0);
    }
  }, [isModalOpen, selectedProduct]);
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [addPhotos] = useAddProductPhotosMutation();
  const { showToast } = useToast();

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
    setIsModalOpen(true);
  };

  const handleView = (product: Product) => {
    setViewProduct(product);
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
        const response = await fetch(`http://localhost:3000/product-photos/product/${product.id}`, {
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        await deleteProduct(id);
        showToast('Produit supprimé avec succès', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      // Store File objects directly, not base64
      setPhotos((prev) => [...prev, ...fileArray]);
    }
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
      PrixVente: Number(formData.get('PrixVente')),
      stockQuantity: Number(formData.get('stockQuantity')),
      isDepot: isDepot,
      surcharge: surcharge || 0,
      categoryId: selectedCategoryId,
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
        const updateData: UpdateProductDto = baseData;
        await updateProduct({ id: selectedProduct.id, data: updateData });
        productId = selectedProduct.id;
        showToast('Produit modifié avec succès', 'success');
      } else {
        const createData: CreateProductDto = baseData as CreateProductDto;
        const result = await createProduct(createData).unwrap();
        productId = result.id;
        showToast('Produit créé avec succès', 'success');
      }

      // Upload photos as files to server/uploads
      if (photos.length > 0 && productId) {
        const token = localStorage.getItem('token');
        const uploadPromises = photos
          .filter((photo): photo is File => photo instanceof File)
          .map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('productId', productId);

            const response = await fetch('http://localhost:3000/product-photos/upload', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                // Don't set Content-Type, browser will set it with boundary for FormData
              },
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Failed to upload photo: ${file.name}`);
            }
            return response.json();
          });

        await Promise.all(uploadPromises);
        showToast('Photos téléchargées avec succès', 'success');
      }

      setIsModalOpen(false);
      setSelectedProduct(null);
      setPhotos([]);
      setExistingPhotos([]);
      setSurcharge(0);
      setDepotPercentage(0);
      setIsDepot(false);
    } catch (error) {
      console.error('Error:', error);
      showToast('Erreur lors de l\'opération', 'error');
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/products/export/csv`, {
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
    fetch(`http://localhost:3000/products/export/pdf`, {
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

  // Get products from infinite query - data accumulates as pages load
  const products = data?.data || [];
  const totalProducts = data?.meta?.total || 0;

  const columns: Column<Product & { isSold?: boolean; photos?: any[] }>[] = [
    {
      header: 'Photo',
      accessor: (row) => {
        const firstPhoto = (row as any).photos?.[0]?.photoDoc;
        if (firstPhoto) {
          const photoUrl = firstPhoto.startsWith('http') || firstPhoto.startsWith('/uploads')
            ? `http://localhost:3000${firstPhoto.startsWith('/') ? '' : '/'}${firstPhoto}`
            : firstPhoto;
          return (
            <img
              src={photoUrl}
              alt={row.productName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          );
        }
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
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

  // Infinite scroll detection
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          setPage((prev) => prev + 1);
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, isDepotFilter]);

  const formPrixVente = isModalOpen ? (document.querySelector('input[name="PrixVente"]') as HTMLInputElement)?.value : '0';
  const formPrixAchat = isModalOpen ? (document.querySelector('input[name="PrixAchat"]') as HTMLInputElement)?.value : '0';
  const earnings = calculateEarnings(
    Number(formPrixVente) || 0,
    Number(formPrixAchat) || 0,
    depotPercentage
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Produits</h1>
        <p className="text-gray-600 mt-2">Gérez tous les produits</p>
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
              {categoriesData?.data.map((cat) => (
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
        pagination={undefined}
        actions={(row) => (
          <>
            <button
              onClick={() => handleView(row)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Voir les détails"
            >
              <Eye className="w-4 h-4" />
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
              defaultValue={selectedProduct?.productName}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Co-Client</label>
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
                    const photoUrl = photo.photoDoc.startsWith('http') || photo.photoDoc.startsWith('/uploads')
                      ? `http://localhost:3000${photo.photoDoc.startsWith('/') ? '' : '/'}${photo.photoDoc}`
                      : photo.photoDoc;
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
        title="Détails du produit"
        size="xl"
      >
        {viewProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewProduct.productName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewProduct.category?.categoryName || '-'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg min-h-[60px]">{viewProduct.description || '-'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente (TND)</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewProduct.PrixVente}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (TND)</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewProduct.PrixAchat}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewProduct.stockQuantity}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut Dépôt</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${viewProduct.isDepot ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}>
                    {viewProduct.isDepot ? 'En dépôt' : 'Non en dépôt'}
                  </span>
                </p>
              </div>
              {viewProduct.isDepot && viewProduct.depotPercentage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage dépôt (%)</label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewProduct.depotPercentage}</p>
                </div>
              )}
            </div>
            {viewProduct.coClient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Co-Client</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {viewProduct.coClient.firstName} {viewProduct.coClient.lastName}
                </p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setViewProduct(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductsPage;
