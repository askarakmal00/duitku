'use client';
import React, { createContext, useContext, useCallback } from 'react';
import { SpaceId } from '@/lib/spaceStore';

interface SpaceContextType {
  activeSpace: SpaceId;
  isUnlocked: boolean;
  setSpace: (space: SpaceId) => void;
  switchSpace: (targetSpace: SpaceId, pin: string) => boolean;
  lockApp: () => void;
  updatePin: (oldPin: string, newPin: string) => boolean;
}

const SpaceContext = createContext<SpaceContextType>({
  activeSpace: 'keluarga',
  isUnlocked: true,
  setSpace: () => {},
  switchSpace: () => true,
  lockApp: () => {},
  updatePin: () => true,
});

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const setSpace = useCallback(() => {}, []);
  const switchSpace = useCallback(() => true, []);
  const lockApp = useCallback(() => {}, []);
  const updatePin = useCallback(() => true, []);

  return (
    <SpaceContext.Provider
      value={{
        activeSpace: 'keluarga',
        isUnlocked: true,
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
  return useContext(SpaceContext);
}
