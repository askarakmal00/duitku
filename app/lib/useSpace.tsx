'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SpaceId, getActiveSpace, setActiveSpace as setStorageSpace, clearActiveSpace, verifyPin, changePin, SPACES, getSpaceMeta } from '@/lib/spaceStore';
import { notifyDataChanged } from '@/lib/store';

interface SpaceContextType {
  activeSpace: SpaceId | null;
  isUnlocked: boolean;
  setSpace: (space: SpaceId) => void;
  switchSpace: (targetSpace: SpaceId, pin: string) => boolean;
  lockApp: () => void;
  updatePin: (oldPin: string, newPin: string) => boolean;
}

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [activeSpace, setActiveSpaceState] = useState<SpaceId | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = getActiveSpace();
    if (saved) {
      setActiveSpaceState(saved);
    }
    setIsReady(true);
  }, []);

  const setSpace = useCallback((space: SpaceId) => {
    setStorageSpace(space);
    setActiveSpaceState(space);
    notifyDataChanged();
  }, []);

  const switchSpace = useCallback((targetSpace: SpaceId, pin: string): boolean => {
    if (verifyPin(targetSpace, pin)) {
      setStorageSpace(targetSpace);
      setActiveSpaceState(targetSpace);
      notifyDataChanged();
      return true;
    }
    return false;
  }, []);

  const lockApp = useCallback(() => {
    clearActiveSpace();
    setActiveSpaceState(null);
    notifyDataChanged();
  }, []);

  const updatePin = useCallback((oldPin: string, newPin: string): boolean => {
    if (!activeSpace) return false;
    return changePin(activeSpace, oldPin, newPin);
  }, [activeSpace]);

  // Don't render until we read sessionStorage to avoid screen flicker
  if (!isReady) {
    return null;
  }

  return (
    <SpaceContext.Provider
      value={{
        activeSpace,
        isUnlocked: activeSpace !== null,
        setSpace,
        switchSpace,
        lockApp,
        updatePin,
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace() {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error('useSpace must be used within a SpaceProvider');
  }
  return context;
}
