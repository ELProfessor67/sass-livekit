import { useState, useMemo } from 'react';

interface UseCallDataProcessorProps {
  callLogs: any[];
  itemsPerPage: number;
}

export function useCallDataProcessor({ callLogs, itemsPerPage }: UseCallDataProcessorProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    return Math.ceil(callLogs.length / itemsPerPage);
  }, [callLogs.length, itemsPerPage]);

  const currentCalls = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return callLogs.slice(startIndex, endIndex);
  }, [callLogs, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    currentCalls,
    totalPages,
    currentPage,
    handlePageChange
  };
}