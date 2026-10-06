'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Delete, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  expectedPin?: string;
  verifyFn?: (pin: string) => boolean;
}

export default function PinModal({
  isOpen,
  title,
  subtitle,
  icon,
  onSuccess,
  onCancel,
  expectedPin,
  verifyFn,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsError(false);
      setErrorMessage('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyPress, handleDelete, onCancel]);

  useEffect(() => {
    if (pin.length === 6) {
      let valid = false;
      if (verifyFn) {
        valid = verifyFn(pin);
      } else if (expectedPin) {
        valid = pin === expectedPin;
      }

      if (valid) {
        onSuccess();
      } else {
        setIsError(true);
        setErrorMessage('PIN salah, silakan coba lagi');
        setTimeout(() => {
          setPin('');
          setIsError(false);
          inputRef.current?.focus();
        }, 700);
      }
    }
  }, [pin, expectedPin, verifyFn, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="pin-overlay">
      <div className="pin-container">
        {onCancel && (
          <button className="pin-close-btn" onClick={onCancel} aria-label="Tutup">
            <X size={20} />
          </button>
        )}

        <div className="pin-header">
          {icon && <div className="pin-icon">{icon}</div>}
          <h2 className="pin-title">{title}</h2>
          {subtitle && <p className="pin-subtitle">{subtitle}</p>}
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

        {/* 6 Digit Boxes */}
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
            Ketuk kolom angka untuk memunculkan keyboard
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
    </div>
  );
}
