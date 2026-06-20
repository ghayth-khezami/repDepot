import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetSubCategoriesQuery } from '../store/api/subCategoryApi';
import {
  useGetSubSubCategories1Query,
  useGetSubSubCategories2Query,
  useGetSubSubCategories3Query,
} from '../store/api/subSubCategoryApi';
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
  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: 100 });
  const { data: subCategories } = useGetSubCategoriesQuery(
    { page: 1, limit: 100, categoryId: value.categoryId || undefined },
    { skip: !value.categoryId },
  );
  const { data: ss1 } = useGetSubSubCategories1Query(
    { page: 1, limit: 100, subCategoryId: value.subCategoryId || undefined },
    { skip: !value.subCategoryId },
  );
  const { data: ss2 } = useGetSubSubCategories2Query(
    { page: 1, limit: 100, subSubCategory1Id: value.subSubCategory1Id || undefined },
    { skip: !value.subSubCategory1Id },
  );
  const { data: ss3 } = useGetSubSubCategories3Query(
    { page: 1, limit: 100, subSubCategory2Id: value.subSubCategory2Id || undefined },
    { skip: !value.subSubCategory2Id },
  );

  const subList = subCategories?.data ?? [];
  const ss1List = ss1?.data ?? [];
  const ss2List = ss2?.data ?? [];
  const ss3List = ss3?.data ?? [];

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
          disabled={disabled}
        >
          <option value="">Choisir…</option>
          {(categories?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </SelectInput>
      </FieldLabel>

      {value.categoryId && subList.length > 0 ? (
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
            disabled={disabled}
          >
            <option value="">Choisir…</option>
            {subList.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}

      {value.subCategoryId && ss1List.length > 0 ? (
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
            disabled={disabled}
          >
            <option value="">Choisir…</option>
            {ss1List.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}

      {value.subSubCategory1Id && ss2List.length > 0 ? (
        <FieldLabel label="Sous-sous-catégorie 2">
          <SelectInput
            value={value.subSubCategory2Id}
            onChange={(e) => patch({ subSubCategory2Id: e.target.value, subSubCategory3Id: '' })}
            disabled={disabled}
          >
            <option value="">Choisir…</option>
            {ss2List.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}

      {value.subSubCategory2Id && ss3List.length > 0 ? (
        <FieldLabel label="Sous-sous-catégorie 3">
          <SelectInput
            value={value.subSubCategory3Id}
            onChange={(e) => patch({ subSubCategory3Id: e.target.value })}
            disabled={disabled}
          >
            <option value="">Choisir…</option>
            {ss3List.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      ) : null}
    </div>
  );
}
