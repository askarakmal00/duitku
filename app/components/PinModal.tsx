'use client';
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsError(false);
      setErrorMessage('');
    }
  }, [isOpen]);

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
        }, 800);
      }
    }
  }, [pin, expectedPin, verifyFn, onSuccess]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6 && !isError) {
      setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    if (!isError) {
      setPin(prev => prev.slice(0, -1));
    }
  };

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

        {/* 6-dot indicator */}
        <div className={`pin-dots ${isError ? 'pin-dots-shake' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map(index => (
            <div
              key={index}
              className={`pin-dot ${index < pin.length ? 'filled' : ''} ${isError ? 'error' : ''}`}
            />
          ))}
        </div>

        {errorMessage && <div className="pin-error-text">{errorMessage}</div>}

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
    </div>
  );
}
