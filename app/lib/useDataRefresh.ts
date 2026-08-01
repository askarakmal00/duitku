'use client';
import { useEffect } from 'react';

export function useDataRefresh(loadFn: () => void) {
  useEffect(() => {
    loadFn();

    const handleDataChanged = () => {
      loadFn();
    };

    window.addEventListener('pf_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('pf_data_changed', handleDataChanged);
    };
  }, [loadFn]);
}
