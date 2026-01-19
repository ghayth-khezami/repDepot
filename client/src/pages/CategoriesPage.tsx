import { useState } from 'react';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } from '../store/api/categoryApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CategoriesPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const { data, isLoading } = useGetCategoriesQuery({ page, limit, search });
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const { showToast } = useToast();

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setIsEditMode(true);
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      try {
        await deleteCategory(id);
        showToast('Catégorie supprimée avec succès', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      if (isEditMode && selectedCategory) {
        const data: UpdateCategoryDto = {
          categoryName: formData.get('categoryName') as string,
          description: (formData.get('description') as string) || undefined,
        };
        await updateCategory({ id: selectedCategory.id, data });
        showToast('Catégorie modifiée avec succès', 'success');
      } else {
        const data: CreateCategoryDto = {
          categoryName: formData.get('categoryName') as string,
          description: (formData.get('description') as string) || undefined,
        };
        await createCategory(data);
        showToast('Catégorie créée avec succès', 'success');
      }
      setIsModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      showToast('Erreur lors de l\'opération', 'error');
    }
  };

  const columns: Column<Category>[] = [
    { header: 'Nom de la catégorie', accessor: 'categoryName' },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Date de création',
      accessor: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Catégories</h1>
        <p className="text-gray-600 mt-2">Gérez toutes les catégories de produits</p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom ou description..."
        onSearch={setSearch}
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                limit: data.meta.limit,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
                onLimitChange: setLimit,
              }
            : undefined
        }
        actions={(row) => (
          <>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        onAdd={handleAdd}
        addButtonLabel="Ajouter une catégorie"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        title={isEditMode ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la catégorie</label>
            <input
              type="text"
              name="categoryName"
              defaultValue={selectedCategory?.categoryName}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              defaultValue={selectedCategory?.description}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedCategory(null);
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
    </div>
  );
};

export default CategoriesPage;
