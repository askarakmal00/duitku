'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpaceId, getSpaceMeta, verifyPin } from '@/lib/spaceStore';
import { ShieldCheck, Users, User, ArrowRight, ArrowLeft, Delete } from 'lucide-react';

interface SpaceSelectModalProps {
  isOpen: boolean;
  onSelectSpace: (space: SpaceId) => void;
}

export default function SpaceSelectModal({ isOpen, onSelectSpace }: SpaceSelectModalProps) {
  const [selectedSpace, setSelectedSpace] = useState<SpaceId | null>(null);
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset PIN when switching space selection
  const handleChooseSpace = (space: SpaceId) => {
    setSelectedSpace(space);
    setPin('');
    setIsError(false);
    setErrorMessage('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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

  // Auto focus input when PIN view opens
  useEffect(() => {
    if (selectedSpace) {
      inputRef.current?.focus();
    }
  }, [selectedSpace]);

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
        inputRef.current?.focus();
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
                Sentuh kolom di bawah atau ketik 6 digit PIN
              </p>
            </div>

            {/* Hidden Input for Native Keyboard Support (iOS / iPad / Android) */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(val);
              }}
              style={{
                position: 'absolute',
                opacity: 0,
                pointerEvents: 'none',
                width: 1,
                height: 1,
              }}
              aria-label="Input PIN"
            />

            {/* 6-box indicator: Clickable on iPad to open virtual keypad */}
            <div
              className={`pin-boxes ${isError ? 'pin-dots-shake' : ''}`}
              onClick={() => inputRef.current?.focus()}
              role="button"
              tabIndex={0}
              title="Sentuh untuk mengetik PIN"
            >
              {[0, 1, 2, 3, 4, 5].map(index => {
                const hasValue = index < pin.length;
                const isCurrent = index === pin.length;
                return (
                  <div
                    key={index}
                    className={`pin-box-item ${hasValue ? 'filled' : ''} ${isCurrent ? 'active' : ''} ${isError ? 'error' : ''}`}
                  >
                    {hasValue ? '•' : ''}
                  </div>
                );
              })}
            </div>

            {errorMessage ? (
              <div className="pin-error-text">{errorMessage}</div>
            ) : (
              <div
                className="space-pin-hint-text"
                onClick={() => inputRef.current?.focus()}
                style={{ cursor: 'pointer' }}
              >
                Ketuk kolom angka untuk memunculkan keyboard, atau gunakan tombol di bawah
              </div>
            )}

            {/* Numpad with Touch Optimization */}
            <div className="pin-numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  className="pin-key"
                  onClick={() => handleKeyPress(digit)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyPress(digit);
                  }}
                >
                  {digit}
                </button>
              ))}
              <div className="pin-key-dummy" />
              <button
                type="button"
                className="pin-key"
                onClick={() => handleKeyPress('0')}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleKeyPress('0');
                }}
              >
                0
              </button>
              <button
                type="button"
                className="pin-key pin-key-action"
                onClick={handleDelete}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                aria-label="Hapus"
              >
                <Delete size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
