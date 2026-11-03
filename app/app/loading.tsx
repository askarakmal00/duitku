import React from 'react';

export default function Loading() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div
            style={{
              width: 140,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeletonPulse 1.5s infinite ease-in-out',
            }}
          />
          <div
            style={{
              width: 200,
              height: 14,
              borderRadius: 6,
              marginTop: 8,
              background: 'linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeletonPulse 1.5s infinite ease-in-out',
            }}
          />
        </div>
        <div
          style={{
            width: 100,
            height: 36,
            borderRadius: 20,
            background: 'linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonPulse 1.5s infinite ease-in-out',
          }}
        />
      </div>

      {/* Cards row skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 110,
              borderRadius: 16,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                width: '45%',
                height: 14,
                borderRadius: 4,
                background: '#E2E8F0',
                animation: 'skeletonPulse 1.5s infinite',
              }}
            />
            <div
              style={{
                width: '70%',
                height: 24,
                borderRadius: 6,
                background: '#E2E8F0',
                animation: 'skeletonPulse 1.5s infinite',
              }}
            />
            <div
              style={{
                width: '35%',
                height: 12,
                borderRadius: 4,
                background: '#F1F5F9',
                animation: 'skeletonPulse 1.5s infinite',
              }}
            />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 20,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ width: 160, height: 18, borderRadius: 6, background: '#E2E8F0', animation: 'skeletonPulse 1.5s infinite' }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F1F5F9', animation: 'skeletonPulse 1.5s infinite' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: 120, height: 14, borderRadius: 4, background: '#E2E8F0', animation: 'skeletonPulse 1.5s infinite' }} />
                <div style={{ width: 80, height: 11, borderRadius: 4, background: '#F1F5F9', animation: 'skeletonPulse 1.5s infinite' }} />
              </div>
            </div>
            <div style={{ width: 70, height: 16, borderRadius: 4, background: '#E2E8F0', animation: 'skeletonPulse 1.5s infinite' }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
