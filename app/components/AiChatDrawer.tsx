'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Image as ImageIcon, Trash2, Loader2, Bot, User, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imagePreview?: string;
  action?: string;
  createdAt: string;
}

export default function AiChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ file: File; base64: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Halo! Saya asisten AI DuitKu. Anda bisa mengetik pengeluaran, mengunggah foto struk belanja, atau bertanya seputar keuangan Anda (misal: "Berapa pengeluaran bulan ini?").',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar/foto struk.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        file,
        base64: base64String,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text && !selectedImage) return;

    const userMsgId = 'msg-' + Date.now();
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      imagePreview: selectedImage ? `data:${selectedImage.file.type};base64,${selectedImage.base64}` : undefined,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    const imagePayload = selectedImage ? selectedImage.base64 : undefined;
    const mimePayload = selectedImage ? selectedImage.file.type : undefined;
    setSelectedImage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          imageBase64: imagePayload,
          mimeType: mimePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesan');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: data.replyText,
          action: data.action,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // If a transaction was recorded, refresh the app data everywhere!
      if (data.action === 'record_transaction') {
        window.dispatchEvent(new Event('pf_data_changed'));
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: `❌ ${err.message || 'Terjadi kesalahan saat memproses'}`,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Buka Asisten AI"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 45,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          color: '#FFFFFF',
          padding: '12px 18px',
          borderRadius: 999,
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13.5,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <Sparkles size={18} />
        <span>Tanya AI & Scan Struk</span>
      </button>

      {/* Slide-in Drawer Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              height: '100%',
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                    Asisten AI DuitKu
                  </div>
                  <div style={{ fontSize: 11.5, color: '#10B981', fontWeight: 600 }}>
                    ● Powered by Gemini Flash
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 8,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Suggestions */}
            <div
              style={{
                padding: '10px 16px',
                background: '#F1F5F9',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              {[
                'Berapa pengeluaran bulan ini?',
                'Cek saldo kas keluarga',
                'Ada talangan belum diganti?',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={loading}
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '12px 14px',
                      borderRadius: 16,
                      borderBottomRightRadius: msg.sender === 'user' ? 4 : 16,
                      borderBottomLeftRadius: msg.sender === 'ai' ? 4 : 16,
                      background: msg.sender === 'user' ? '#4F46E5' : '#F8FAFC',
                      color: msg.sender === 'user' ? '#FFFFFF' : '#0F172A',
                      border: msg.sender === 'ai' ? '1px solid #E2E8F0' : 'none',
                      fontSize: 13,
                      lineHeight: 1.5,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    {msg.imagePreview && (
                      <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden' }}>
                        <img
                          src={msg.imagePreview}
                          alt="Struk Belanja"
                          style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: msg.text.replace(/\n/g, '<br/>'),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#94A3B8',
                      marginTop: 3,
                      padding: '0 4px',
                    }}
                  >
                    {msg.createdAt}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 12.5 }}>
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  <span>AI sedang menganalisis...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Image Preview before sending */}
            {selectedImage && (
              <div
                style={{
                  padding: '8px 16px',
                  background: '#FEF3C7',
                  borderTop: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={16} className="text-amber-700" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                    Foto struk terpilih: {selectedImage.file.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  style={{ background: 'none', border: 'none', color: '#B45309', cursor: 'pointer' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #E2E8F0',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Unggah Foto Struk"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <ImageIcon size={18} />
              </button>

              <input
                type="text"
                placeholder={selectedImage ? 'Tambahkan catatan jika ada...' : 'Ketik pengeluaran / pertanyaan...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  fontSize: 13,
                  outline: 'none',
                  color: '#0F172A',
                }}
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={loading || (!inputMessage.trim() && !selectedImage)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: loading || (!inputMessage.trim() && !selectedImage) ? '#E2E8F0' : '#4F46E5',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading || (!inputMessage.trim() && !selectedImage) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

