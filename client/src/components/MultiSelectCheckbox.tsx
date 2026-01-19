import { useState, useEffect, useRef } from 'react';

interface MultiSelectCheckboxProps<T> {
  items: T[];
  getOptionLabel: (item: T) => string;
  getOptionValue: (item: T) => string;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

function MultiSelectCheckbox<T extends { id: string }>({
  items,
  getOptionLabel,
  getOptionValue,
  selectedValues,
  onChange,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  placeholder = 'Sélectionner...',
  className = '',
}: MultiSelectCheckboxProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onLoadMore || !hasMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when user scrolls near bottom (within 50px)
      if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading) {
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, onLoadMore]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      <div
        ref={containerRef}
        className="max-h-60 overflow-y-auto p-2 space-y-1"
      >
        {items.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {isLoading ? 'Chargement...' : 'Aucune option'}
          </div>
        ) : (
          <>
            {items.map((item) => {
              const value = getOptionValue(item);
              const isSelected = selectedValues.includes(value);
              return (
                <label
                  key={value}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(value)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 flex-1">
                    {getOptionLabel(item).includes('🔴') ? (
                      <>
                        {getOptionLabel(item).split('🔴')[0]}
                        <span className="text-red-600 font-semibold">🔴</span>
                        {getOptionLabel(item).split('🔴')[1]}
                      </>
                    ) : (
                      getOptionLabel(item)
                    )}
                  </span>
                </label>
              );
            })}
            {hasMore && (
              <div className="text-xs text-gray-500 text-center py-2">
                {isLoading ? 'Chargement...' : 'Faites défiler pour charger plus'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MultiSelectCheckbox;
