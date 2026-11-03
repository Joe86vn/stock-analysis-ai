'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MarketDataSource } from '@/lib/data-providers/types';

interface DataSourceContextValue {
  currentSource: MarketDataSource;
  setSource: (source: MarketDataSource) => void;
  buildSourceUrl: (baseUrl: string, extraParams?: Record<string, any>) => string;
}

const DataSourceContext = createContext<DataSourceContextValue>({
  currentSource: 'auto',
  setSource: () => {},
  buildSourceUrl: (baseUrl) => baseUrl,
});

const STORAGE_KEY = 'valuex_data_source';

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [currentSource, setCurrentSourceState] = useState<MarketDataSource>('auto');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as MarketDataSource;
      if (saved && (saved === 'auto' || saved === 'vietcap' || saved === 'mas')) {
        setCurrentSourceState(saved);
      }
    } catch {
      // Ignored
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setSource = (newSource: MarketDataSource) => {
    setCurrentSourceState(newSource);
    try {
      localStorage.setItem(STORAGE_KEY, newSource);
    } catch {
      // Ignored
    }
  };

  /**
   * Helper gắn query ?source= vào URL nếu cần
   */
  const buildSourceUrl = (baseUrl: string, extraParams: Record<string, any> = {}) => {
    try {
      const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      
      // Gắn extraParams
      for (const [k, v] of Object.entries(extraParams)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }

      // Gắn source nếu chưa có trong extraParams
      if (!url.searchParams.has('source') && currentSource !== 'auto') {
        url.searchParams.set('source', currentSource);
      }

      return url.pathname + url.search;
    } catch {
      return baseUrl;
    }
  };

  return (
    <DataSourceContext.Provider
      value={{
        currentSource,
        setSource,
        buildSourceUrl,
      }}
    >
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}

