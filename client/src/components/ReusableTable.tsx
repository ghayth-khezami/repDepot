import { ReactNode, useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, FileText, Grid, List } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  render?: (value: any, row: T) => ReactNode;
}

interface ReusableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (search: string) => void;
  filters?: ReactNode;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  actions?: (row: T) => ReactNode;
  onAdd?: () => void;
  addButtonLabel?: string;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
}

function ReusableTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  searchPlaceholder = 'Rechercher...',
  onSearch,
  filters,
  pagination,
  actions,
  onAdd,
  addButtonLabel = 'Ajouter',
  onExportCsv,
  onExportPdf,
}: ReusableTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [userPreference, setUserPreference] = useState<'table' | 'cards' | null>(null);

  // Detect mobile screen size and auto-switch view mode
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      // Force cards on mobile, use user preference or default to table on desktop
      if (mobile) {
        setViewMode('cards');
      } else {
        setViewMode(userPreference || 'table');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [userPreference]);

  // Handle manual view mode change (desktop only)
  const handleViewModeChange = (mode: 'table' | 'cards') => {
    if (!isMobile) {
      setUserPreference(mode);
      setViewMode(mode);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const renderCell = (column: Column<T>, row: T) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    return column.render ? column.render(value, row) : String(value ?? '');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {onSearch && (
            <div className="flex-1 w-full sm:w-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}
          {filters && <div className="flex gap-2 flex-wrap">{filters}</div>}
          <div className="flex gap-2 flex-wrap">
            {/* View toggle only on desktop */}
            {!isMobile && (
              <button
                onClick={() => handleViewModeChange(viewMode === 'table' ? 'cards' : 'table')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={viewMode === 'table' ? 'Vue cartes' : 'Vue tableau'}
              >
                {viewMode === 'table' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
              </button>
            )}
            {onExportCsv && (
              <button
                onClick={onExportCsv}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
            {onExportPdf && (
              <button
                onClick={onExportPdf}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className="px-4 sm:px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base"
              >
                {addButtonLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table View - Desktop Only */}
      {viewMode === 'table' && !isMobile && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="text-left py-3 px-4 text-sm font-semibold text-gray-700"
                  >
                    {column.header}
                  </th>
                ))}
                {actions && <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8 text-gray-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {columns.map((column, index) => (
                      <td key={index} className="py-3 px-4 text-sm text-gray-700">
                        {renderCell(column, row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">{actions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards View - Mobile & Desktop */}
      {viewMode === 'cards' && (
        <div>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
          ) : (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4 sm:gap-6`}>
              {data.map((row, index) => {
                // Find photo column
                const photoColumn = columns.find((col) => col.header === 'Photo' || col.header === 'photo');
                const photoCell = photoColumn ? renderCell(photoColumn, row) : null;
                const otherColumns = columns.filter((col) => col.header !== 'Photo' && col.header !== 'photo');
                
                return (
                  <div
                    key={row.id}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 animate-card-enter"
                    style={{
                      animationDelay: `${index * 0.05}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    {photoCell && (
                      <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="w-full h-full object-cover">
                          {photoCell}
                        </div>
                      </div>
                    )}
                    <div className="p-4 sm:p-6 space-y-3">
                      {otherColumns.slice(0, isMobile ? 4 : 6).map((column, colIndex) => {
                        const cellValue = renderCell(column, row);
                        // Skip empty values
                        if (!cellValue || cellValue === 'null' || cellValue === 'undefined') return null;
                        
                        return (
                          <div
                            key={colIndex}
                            className="flex flex-col sm:flex-row sm:justify-between gap-1 pb-2 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide">
                              {column.header}
                            </span>
                            <span className="text-sm sm:text-base text-gray-900 font-medium text-right break-words">
                              {cellValue}
                            </span>
                          </div>
                        );
                      })}
                      {otherColumns.length > (isMobile ? 4 : 6) && (
                        <div className="pt-2 text-xs text-gray-400 italic">
                          +{otherColumns.length - (isMobile ? 4 : 6)} autres champs
                        </div>
                      )}
                    </div>
                    {actions && (
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-gray-200 bg-gray-50">
                        <div className="flex justify-end gap-2">
                          {actions(row)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Affichage de {(pagination.page - 1) * pagination.limit + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} résultats
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700 px-2">
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <select
              value={pagination.limit}
              onChange={(e) => pagination.onLimitChange(Number(e.target.value))}
              className="ml-4 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReusableTable;
