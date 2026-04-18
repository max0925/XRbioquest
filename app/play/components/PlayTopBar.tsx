'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PlayTopBar() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');

  // Read the game title from the loaded config (set by page.tsx on window)
  useEffect(() => {
    const check = () => {
      const t = (window as any).__playGameTitle;
      if (t) setTitle(t);
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '44px',
        zIndex: 10020,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <button
        onClick={() => router.push('/dashboard')}
        style={{
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          padding: '4px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ fontSize: '16px' }}>&larr;</span> Exit
      </button>
      {title && (
        <span
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
}
