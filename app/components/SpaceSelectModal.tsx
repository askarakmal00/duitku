'use client';
import React, { useState } from 'react';
import { SpaceId, SPACES, getSpaceMeta, verifyPin, getPin } from '@/lib/spaceStore';
import PinModal from '@/components/PinModal';
import { ShieldCheck, Users, User, ArrowRight } from 'lucide-react';

interface SpaceSelectModalProps {
  isOpen: boolean;
  onSelectSpace: (space: SpaceId) => void;
}

export default function SpaceSelectModal({ isOpen, onSelectSpace }: SpaceSelectModalProps) {
  const [selectedSpace, setSelectedSpace] = useState<SpaceId | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);

  if (!isOpen) return null;

  const handleChooseSpace = (space: SpaceId) => {
    setSelectedSpace(space);
    setIsPinOpen(true);
  };

  const handlePinSuccess = () => {
    if (selectedSpace) {
      setIsPinOpen(false);
      onSelectSpace(selectedSpace);
    }
  };

  const currentMeta = selectedSpace ? getSpaceMeta(selectedSpace) : null;

  return (
    <>
      <div className="space-select-overlay">
        <div className="space-select-container">
          <div className="space-select-header">
            <div className="space-select-logo-badge">
              <span className="space-select-brand-icon">D</span>
            </div>
            <h1 className="space-select-title">Selamat Datang di Duitku</h1>
            <p className="space-select-subtitle">Pilih ruang keuangan yang ingin Anda akses</p>
          </div>

          <div className="space-select-cards">
            {/* Keluarga Card */}
            <div
              className="space-card space-card-keluarga"
              onClick={() => handleChooseSpace('keluarga')}
              role="button"
              tabIndex={0}
            >
              <div className="space-card-top">
                <div className="space-card-icon-wrapper keluarga">
                  <Users size={28} />
                </div>
                <div className="space-card-badge keluarga">Bersama</div>
              </div>
              <div className="space-card-info">
                <h3 className="space-card-name">Duitku Keluarga</h3>
                <p className="space-card-desc">
                  Catat & pantau kas bersama Asykar & Istri, setoran bulanan, operasional rumah tangga, dan cicilan bersama.
                </p>
              </div>
              <div className="space-card-footer">
                <span className="space-card-action">Masuk dengan PIN</span>
                <ArrowRight size={18} className="space-card-arrow" />
              </div>
            </div>

            {/* Pribadi Asykar Card */}
            <div
              className="space-card space-card-pribadi"
              onClick={() => handleChooseSpace('pribadi')}
              role="button"
              tabIndex={0}
            >
              <div className="space-card-top">
                <div className="space-card-icon-wrapper pribadi">
                  <User size={28} />
                </div>
                <div className="space-card-badge pribadi">Pribadi</div>
              </div>
              <div className="space-card-info">
                <h3 className="space-card-name">Duitku Pribadi (Asykar)</h3>
                <p className="space-card-desc">
                  Kelola penghasilan, anggaran pribadi, pos belanja khusus, tabungan impian, dan hutang piutang mandiri.
                </p>
              </div>
              <div className="space-card-footer">
                <span className="space-card-action">Masuk dengan PIN</span>
                <ArrowRight size={18} className="space-card-arrow" />
              </div>
            </div>
          </div>

          <div className="space-select-note">
            <ShieldCheck size={16} />
            <span>Dilindungi keamanan 6 digit PIN. Data tetap tersimpan aman.</span>
          </div>
        </div>
      </div>

      {/* Pin Input Modal */}
      {selectedSpace && (
        <PinModal
          isOpen={isPinOpen}
          title={`PIN ${currentMeta?.name}`}
          subtitle={`Masukkan 6 digit PIN untuk membuka ${currentMeta?.name}`}
          icon={currentMeta?.icon}
          onSuccess={handlePinSuccess}
          onCancel={() => setIsPinOpen(false)}
          verifyFn={(pin) => verifyPin(selectedSpace, pin)}
        />
      )}
    </>
  );
}
