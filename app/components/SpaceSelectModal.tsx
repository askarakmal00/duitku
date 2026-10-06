'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { SpaceId, getSpaceMeta, verifyPin } from '@/lib/spaceStore';
import { ShieldCheck, Users, User, ArrowRight, ArrowLeft, Delete, Lock } from 'lucide-react';

interface SpaceSelectModalProps {
  isOpen: boolean;
  onSelectSpace: (space: SpaceId) => void;
}

export default function SpaceSelectModal({ isOpen, onSelectSpace }: SpaceSelectModalProps) {
  const [selectedSpace, setSelectedSpace] = useState<SpaceId | null>(null);
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset PIN when switching space selection
  const handleChooseSpace = (space: SpaceId) => {
    setSelectedSpace(space);
    setPin('');
    setIsError(false);
    setErrorMessage('');
  };

  const handleBackToSelect = () => {
    setSelectedSpace(null);
    setPin('');
    setIsError(false);
    setErrorMessage('');
  };

  const handleKeyPress = useCallback((digit: string) => {
    if (pin.length < 6 && !isError) {
      setPin(prev => prev + digit);
    }
  }, [pin, isError]);

  const handleDelete = useCallback(() => {
    if (!isError) {
      setPin(prev => prev.slice(0, -1));
    }
  }, [isError]);

  // Handle physical keyboard input (Desktop / Mac)
  useEffect(() => {
    if (!selectedSpace) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleBackToSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSpace, handleKeyPress, handleDelete]);

  // Verify PIN whenever 6 digits are reached
  useEffect(() => {
    if (!selectedSpace || pin.length !== 6) return;

    const isValid = verifyPin(selectedSpace, pin);
    if (isValid) {
      onSelectSpace(selectedSpace);
    } else {
      setIsError(true);
      setErrorMessage('PIN salah, silakan coba lagi');
      const timer = setTimeout(() => {
        setPin('');
        setIsError(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [pin, selectedSpace, onSelectSpace]);

  if (!isOpen) return null;

  const currentMeta = selectedSpace ? getSpaceMeta(selectedSpace) : null;

  return (
    <div className="space-select-overlay">
      <div className="space-select-container">
        {!selectedSpace ? (
          /* ─── TAMPILAN 1: PILIH RUANG ─── */
          <>
            <div className="space-select-header">
              <div className="space-select-logo-badge">
                <span className="space-select-brand-icon">D</span>
              </div>
              <h1 className="space-select-title">Selamat Datang di Duitku</h1>
              <p className="space-select-subtitle">Pilih ruang keuangan yang ingin Anda akses</p>
            </div>

            <div className="space-select-cards">
              {/* Card Duitku Keluarga */}
              <button
                type="button"
                className="space-card space-card-keluarga"
                onClick={() => handleChooseSpace('keluarga')}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleChooseSpace('keluarga');
                }}
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
              </button>

              {/* Card Duitku Pribadi */}
              <button
                type="button"
                className="space-card space-card-pribadi"
                onClick={() => handleChooseSpace('pribadi')}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleChooseSpace('pribadi');
                }}
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
              </button>
            </div>

            <div className="space-select-note">
              <ShieldCheck size={16} />
              <span>Dilindungi keamanan 6 digit PIN. Data tetap tersimpan aman.</span>
            </div>
          </>
        ) : (
          /* ─── TAMPILAN 2: INPUT PIN INLINE ─── */
          <div className="space-pin-box">
            <button
              type="button"
              className="space-pin-back-btn"
              onClick={handleBackToSelect}
            >
              <ArrowLeft size={16} />
              <span>Pilih ruang lain</span>
            </button>

            <div className="space-pin-header">
              <div className={`space-pin-avatar ${selectedSpace}`}>
                {selectedSpace === 'keluarga' ? <Users size={32} /> : <User size={32} />}
              </div>
              <h2 className="space-pin-title">PIN {currentMeta?.name}</h2>
              <p className="space-pin-subtitle">
                Masukkan 6 digit PIN untuk membuka ruang ini
              </p>
            </div>

            {/* 6-dot indicator */}
            <div className={`pin-dots ${isError ? 'pin-dots-shake' : ''}`}>
              {[0, 1, 2, 3, 4, 5].map(index => (
                <div
                  key={index}
                  className={`pin-dot ${index < pin.length ? 'filled' : ''} ${isError ? 'error' : ''}`}
                />
              ))}
            </div>

            {errorMessage ? (
              <div className="pin-error-text">{errorMessage}</div>
            ) : (
              <div className="space-pin-hint-text">Ketik di keyboard atau tekan tombol di bawah</div>
            )}

            {/* Numpad */}
            <div className="pin-numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  className="pin-key"
                  onClick={() => handleKeyPress(digit)}
                >
                  {digit}
                </button>
              ))}
              <div className="pin-key-dummy" />
              <button
                type="button"
                className="pin-key"
                onClick={() => handleKeyPress('0')}
              >
                0
              </button>
              <button
                type="button"
                className="pin-key pin-key-action"
                onClick={handleDelete}
                aria-label="Hapus"
              >
                <Delete size={22} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
