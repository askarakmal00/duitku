import React from 'react';

export default function TransactionsLoading() {
  return (
    <div className="txn-v2-container" style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ width: 100, height: 12, borderRadius: 4, background: '#E2E8F0', marginBottom: 6, animation: 'txnSkeletonPulse 1.5s infinite' }} />
          <div style={{ width: 160, height: 28, borderRadius: 8, background: '#CBD5E1', marginBottom: 6, animation: 'txnSkeletonPulse 1.5s infinite' }} />
          <div style={{ width: 120, height: 14, borderRadius: 4, background: '#E2E8F0', animation: 'txnSkeletonPulse 1.5s infinite' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 130, height: 38, borderRadius: 12, background: '#E2E8F0', animation: 'txnSkeletonPulse 1.5s infinite' }} />
        </div>
      </div>

      {/* 3 Summary cards skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 110,
              borderRadius: 18,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
              <div style={{ width: 100, height: 14, borderRadius: 4, background: '#E2E8F0', animation: 'txnSkeletonPulse 1.5s infinite' }} />
            </div>
            <div style={{ width: 140, height: 24, borderRadius: 6, background: '#CBD5E1', animation: 'txnSkeletonPulse 1.5s infinite' }} />
            <div style={{ width: 90, height: 12, borderRadius: 4, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
          </div>
        ))}
      </div>

      {/* Table & list skeleton */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 20,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ width: 220, height: 38, borderRadius: 10, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 80, height: 36, borderRadius: 20, background: '#E2E8F0', animation: 'txnSkeletonPulse 1.5s infinite' }} />
            <div style={{ width: 80, height: 36, borderRadius: 20, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
            <div style={{ width: 80, height: 36, borderRadius: 20, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
          </div>
        </div>

        {[1, 2, 3, 4, 6].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: i < 6 ? '1px solid #F8FAFC' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: 140, height: 14, borderRadius: 4, background: '#E2E8F0', animation: 'txnSkeletonPulse 1.5s infinite' }} />
                <div style={{ width: 90, height: 11, borderRadius: 4, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ width: 90, height: 16, borderRadius: 4, background: '#CBD5E1', animation: 'txnSkeletonPulse 1.5s infinite' }} />
              <div style={{ width: 60, height: 10, borderRadius: 4, background: '#F1F5F9', animation: 'txnSkeletonPulse 1.5s infinite' }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes txnSkeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

