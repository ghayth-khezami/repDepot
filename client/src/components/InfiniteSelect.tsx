import { useState, useEffect, useRef } from 'react';

interface InfiniteSelectProps<T> {
  items: T[];
  getOptionLabel: (item: T) => string;
  getOptionValue: (item: T) => string;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function InfiniteSelect<T extends { id: string }>({
  items,
  getOptionLabel,
  getOptionValue,
  value,
  onChange,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  multiple = false,
  placeholder = 'Sélectionner...',
  className = '',
  disabled = false,
}: InfiniteSelectProps<T>) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const select = selectRef.current;
    if (!select || !onLoadMore || !hasMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = select;
      // Load more when user scrolls near bottom (within 50px)
      if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading) {
        onLoadMore();
      }
    };

    select.addEventListener('scroll', handleScroll);
    return () => select.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <select
      ref={selectRef}
      multiple={multiple}
      disabled={disabled}
      value={value}
      onChange={(e) => {
        if (multiple) {
          const values = Array.from(e.target.selectedOptions, (option) => option.value);
          onChange(values);
        } else {
          onChange(e.target.value);
        }
      }}
      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 ${className}`}
      size={multiple ? 5 : undefined}
    >
      {!multiple && <option value="">{placeholder}</option>}
      {items.length === 0 ? (
        <option disabled>{isLoading ? 'Chargement...' : 'Aucune option'}</option>
      ) : (
        <>
          {items.map((item) => (
            <option key={getOptionValue(item)} value={getOptionValue(item)}>
              {getOptionLabel(item)}
            </option>
          ))}
          {hasMore && (
            <option disabled>
              {isLoading ? 'Chargement...' : 'Faites défiler pour charger plus'}
            </option>
          )}
        </>
      )}
    </select>
  );
}

export default InfiniteSelect;
