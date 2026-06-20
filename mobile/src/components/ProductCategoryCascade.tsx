import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetSubCategoriesQuery } from '../store/api/subCategoryApi';
import {
  useGetSubSubCategories1Query,
  useGetSubSubCategories2Query,
  useGetSubSubCategories3Query,
} from '../store/api/subSubCategoryApi';
import { useAutoPaginatedQuery } from '../hooks/usePaginatedList';
import { FieldLabel, SelectInput } from './mobile-forms';

export type CategorySelection = {
  categoryId: string;
  subCategoryId: string;
  subSubCategory1Id: string;
  subSubCategory2Id: string;
  subSubCategory3Id: string;
};

type Props = {
  value: CategorySelection;
  onChange: (next: CategorySelection) => void;
  disabled?: boolean;
};

export function ProductCategoryCascade({ value, onChange, disabled }: Props) {
  const { items: categories, isLoading: loadingCategories } = useAutoPaginatedQuery(
    useGetCategoriesQuery,
    {},
    'categories',
  );
  const { items: subList, isLoading: loadingSub } = useAutoPaginatedQuery(
    useGetSubCategoriesQuery,
    { categoryId: value.categoryId || undefined },
    value.categoryId,
    !!value.categoryId,
  );
  const { items: ss1List, isLoading: loadingSs1 } = useAutoPaginatedQuery(
    useGetSubSubCategories1Query,
    { subCategoryId: value.subCategoryId || undefined },
    value.subCategoryId,
    !!value.subCategoryId,
  );
  const { items: ss2List, isLoading: loadingSs2 } = useAutoPaginatedQuery(
    useGetSubSubCategories2Query,
    { subSubCategory1Id: value.subSubCategory1Id || undefined },
    value.subSubCategory1Id,
    !!value.subSubCategory1Id,
  );
  const { items: ss3List, isLoading: loadingSs3 } = useAutoPaginatedQuery(
    useGetSubSubCategories3Query,
    { subSubCategory2Id: value.subSubCategory2Id || undefined },
    value.subSubCategory2Id,
    !!value.subSubCategory2Id,
  );

  const patch = (partial: Partial<CategorySelection>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="space-y-3">
      <FieldLabel label="Catégorie *">
        <SelectInput
          value={value.categoryId}
          onChange={(e) =>
            patch({
              categoryId: e.target.value,
              subCategoryId: '',
              subSubCategory1Id: '',
              subSubCategory2Id: '',
              subSubCategory3Id: '',
            })
          }
          required
          disabled={disabled || loadingCategories}
        >
          <option value="">{loadingCategories ? 'Chargement…' : 'Choisir…'}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </SelectInput>
      </FieldLabel>

      {value.categoryId && (subList.length > 0 || loadingSub) ? (
        <FieldLabel label="Sous-catégorie">
          <SelectInput
            value={value.subCategoryId}
            onChange={(e) =>
              patch({
                subCategoryId: e.target.value,
                subSubCategory1Id: '',
                subSubCategory2Id: '',
                subSubCategory3Id: '',
              })
            }
            disabled={disabled || loadingSub}
          >
            <option value="">{loadingSub ? 'Chargement…' : 'Choisir…'}</option>
            {subList.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}

      {value.subCategoryId && (ss1List.length > 0 || loadingSs1) ? (
        <FieldLabel label="Sous-sous-catégorie 1">
          <SelectInput
            value={value.subSubCategory1Id}
            onChange={(e) =>
              patch({
                subSubCategory1Id: e.target.value,
                subSubCategory2Id: '',
                subSubCategory3Id: '',
              })
            }
            disabled={disabled || loadingSs1}
          >
            <option value="">{loadingSs1 ? 'Chargement…' : 'Choisir…'}</option>
            {ss1List.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}

      {value.subSubCategory1Id && (ss2List.length > 0 || loadingSs2) ? (
        <FieldLabel label="Sous-sous-catégorie 2">
          <SelectInput
            value={value.subSubCategory2Id}
            onChange={(e) => patch({ subSubCategory2Id: e.target.value, subSubCategory3Id: '' })}
            disabled={disabled || loadingSs2}
          >
            <option value="">{loadingSs2 ? 'Chargement…' : 'Choisir…'}</option>
            {ss2List.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}

      {value.subSubCategory2Id && (ss3List.length > 0 || loadingSs3) ? (
        <FieldLabel label="Sous-sous-catégorie 3">
          <SelectInput
            value={value.subSubCategory3Id}
            onChange={(e) => patch({ subSubCategory3Id: e.target.value })}
            disabled={disabled || loadingSs3}
          >
            <option value="">{loadingSs3 ? 'Chargement…' : 'Choisir…'}</option>
            {ss3List.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}
    </div>
  );
}
