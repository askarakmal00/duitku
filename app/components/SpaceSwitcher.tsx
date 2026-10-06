'use client';
import React, { useState } from 'react';
import { useSpace } from '@/lib/useSpace';
import { SpaceId, SPACES, getSpaceMeta, verifyPin } from '@/lib/spaceStore';
import PinModal from '@/components/PinModal';
import { ChevronDown, Users, User, ArrowLeftRight } from 'lucide-react';

export default function SpaceSwitcher() {
  const { activeSpace, switchSpace, lockApp } = useSpace();
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [targetSpace, setTargetSpace] = useState<SpaceId | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);

  if (!activeSpace) return null;

  const currentMeta = getSpaceMeta(activeSpace);
  const otherSpace: SpaceId = activeSpace === 'keluarga' ? 'pribadi' : 'keluarga';
  const otherMeta = getSpaceMeta(otherSpace);

  const handleSelectSwitch = () => {
    setIsOpenMenu(false);
    setTargetSpace(otherSpace);
    setIsPinOpen(true);
  };

  const handlePinSuccess = () => {
    if (targetSpace) {
      setIsPinOpen(false);
      switchSpace(targetSpace, ''); // Pin already verified in modal or via callback
      // We pass the verified pin
    }
  };

  return (
    <>
      <div className="space-switcher-wrap">
        <button
          type="button"
          className={`space-switcher-btn space-btn-${activeSpace}`}
          onClick={() => setIsOpenMenu(prev => !prev)}
          title="Ganti Ruang Finansial"
        >
          <span className="space-switcher-icon">
            {activeSpace === 'keluarga' ? <Users size={15} /> : <User size={15} />}
          </span>
          <span className="space-switcher-text">{currentMeta.name}</span>
          <ChevronDown size={14} className={`space-switcher-caret ${isOpenMenu ? 'open' : ''}`} />
        </button>

        {isOpenMenu && (
          <>
            <div className="space-menu-backdrop" onClick={() => setIsOpenMenu(false)} />
            <div className="space-switcher-dropdown">
              <div className="space-dropdown-header">
                <span className="space-dropdown-title">Ganti Ruang</span>
              </div>

              <div
                className="space-dropdown-item active"
                onClick={() => setIsOpenMenu(false)}
              >
                <div className={`space-item-icon ${activeSpace}`}>
                  {activeSpace === 'keluarga' ? <Users size={16} /> : <User size={16} />}
                </div>
                <div className="space-item-info">
                  <span className="space-item-name">{currentMeta.name}</span>
                  <span className="space-item-status">Aktif sekarang</span>
                </div>
              </div>

              <div
                className="space-dropdown-item clickable"
                onClick={handleSelectSwitch}
              >
                <div className={`space-item-icon ${otherSpace}`}>
                  {otherSpace === 'keluarga' ? <Users size={16} /> : <User size={16} />}
                </div>
                <div className="space-item-info">
                  <span className="space-item-name">{otherMeta.name}</span>
                  <span className="space-item-hint">Perlu 6 digit PIN</span>
                </div>
                <ArrowLeftRight size={14} className="space-item-arrow" />
              </div>

              <div className="space-dropdown-divider" />

              <button
                type="button"
                className="space-dropdown-lock"
                onClick={() => {
                  setIsOpenMenu(false);
                  lockApp();
                }}
              >
                Kunci Aplikasi
              </button>
            </div>
          </>
        )}
      </div>

      {targetSpace && (
        <PinModal
          isOpen={isPinOpen}
          title={`PIN ${otherMeta.name}`}
          subtitle={`Masukkan PIN untuk beralih ke ${otherMeta.name}`}
          icon={otherMeta.icon}
          onSuccess={() => {
            setIsPinOpen(false);
            // Directly switch space since PIN verified by verifyFn
            switchSpace(targetSpace, ''); 
          }}
          onCancel={() => setIsPinOpen(false)}
          verifyFn={(pin) => {
            const valid = verifyPin(targetSpace, pin);
            if (valid) {
              switchSpace(targetSpace, pin);
            }
            return valid;
          }}
        />
      )}
    </>
  );
}
