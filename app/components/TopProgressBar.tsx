'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname or searchParams change, the navigation has completed!
  useEffect(() => {
    if (visible) {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
      setProgress(100);

      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 200);
      }, 250);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, searchParams]);

  const start = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);

    setVisible(true);
    setProgress(20);

    animIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) {
          if (animIntervalRef.current) clearInterval(animIntervalRef.current);
          return prev;
        }
        // Smooth logarithmic increment
        const diff = (90 - prev) * 0.18 + Math.random() * 2;
        return Math.min(prev + diff, 88);
      });
    }, 120);
  };

  useEffect(() => {
    // Intercept clicks on links for instant feedback (0ms latency)
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external, download, tel, mailto, hash links, or modifier keys
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target.target === '_blank' ||
        target.hasAttribute('download') ||
        e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
      ) {
        return;
      }

      // Check if clicking link to current exact URL
      const currentPath = window.location.pathname;
      const currentFull = currentPath + window.location.search;
      if (href === currentPath || href === currentFull) {
        return;
      }

      start();
    };

    document.addEventListener('click', handleClick, { capture: true });

    // Expose programmatic start/stop event
    const handleCustomStart = () => start();
    const handleCustomStop = () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    };

    window.addEventListener('nav:start', handleCustomStart);
    window.addEventListener('nav:done', handleCustomStop);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('nav:start', handleCustomStart);
      window.removeEventListener('nav:done', handleCustomStop);
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 999999,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
          boxShadow: '0 0 12px #8B5CF6, 0 0 6px #EC4899',
          transition: progress === 100
            ? 'width 0.15s ease-out, opacity 0.25s ease 0.05s'
            : 'width 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)',
          opacity: visible ? 1 : 0,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
