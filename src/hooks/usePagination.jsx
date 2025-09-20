// src/hooks/usePagination.js
import { useState, useMemo } from 'react';

export default function usePagination(items, itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentItems = items.slice(startIndex, endIndex);

    // Calculate visible page numbers (show 5 pages around current)
    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return {
      currentItems,
      currentPage,
      totalPages,
      totalItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      startIndex: startIndex + 1,
      endIndex,
      visiblePages: getVisiblePages(),
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages
    };
  }, [items, currentPage, itemsPerPage]);

  // Navigation functions
  const goToPage = (page) => {
    if (page >= 1 && page <= paginationData.totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (paginationData.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (paginationData.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(paginationData.totalPages);

  // Reset to first page when items change significantly
  const resetPagination = () => setCurrentPage(1);

  return {
    ...paginationData,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    resetPagination,
    setItemsPerPage: (newItemsPerPage) => {
      // Maintain relative position when changing page size
      const currentItemIndex = (currentPage - 1) * itemsPerPage;
      const newPage = Math.floor(currentItemIndex / newItemsPerPage) + 1;
      setCurrentPage(newPage);
    }
  };
}

// Pagination Controls Component
export function PaginationControls({ 
  pagination, 
  className = '',
  showPageSizeSelector = true,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange
}) {
  if (pagination.totalItems === 0) return null;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Items Info */}
      <div className="text-sm text-gray-600">
        Showing {pagination.startIndex} to {pagination.endIndex} of {pagination.totalItems} items
        {showPageSizeSelector && (
          <span className="ml-4">
            Show:
            <select
              value={pageSizeOptions.find(size => pagination.currentItems.length <= size) || pageSizeOptions[pageSizeOptions.length - 1]}
              onChange={(e) => onPageSizeChange && onPageSizeChange(parseInt(e.target.value))}
              className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </span>
        )}
      </div>

      {/* Page Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center gap-2">
          {/* Previous Buttons */}
          <button
            onClick={pagination.goToFirstPage}
            disabled={pagination.isFirstPage}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="First page"
          >
            ««
          </button>
          
          <button
            onClick={pagination.prevPage}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Previous page"
          >
            «
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pagination.visiblePages.map((page, index) => (
              page === '...' ? (
                <span key={`dots-${index}`} className="px-2 py-1 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => pagination.goToPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    page === pagination.currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next Buttons */}
          <button
            onClick={pagination.nextPage}
            disabled={!pagination.hasNextPage}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Next page"
          >
            »
          </button>
          
          <button
            onClick={pagination.goToLastPage}
            disabled={pagination.isLastPage}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Last page"
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}