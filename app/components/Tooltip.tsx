'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (show && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const adjustments: React.CSSProperties = {};
      
      // Keep tooltip within viewport
      if (rect.left < 10) {
        adjustments.left = '0';
        adjustments.transform = 'none';
      }
      if (rect.right > window.innerWidth - 10) {
        adjustments.left = 'auto';
        adjustments.right = '0';
        adjustments.transform = 'none';
      }
      
      setAdjustedPosition(adjustments);
    }
  }, [show]);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
  };

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          ref={tooltipRef}
          style={{
            position: 'absolute',
            ...positionStyles[position],
            ...adjustedPosition,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
          }}>
          {content}
          {/* Arrow - only show if not adjusted */}
          {!adjustedPosition.transform && (
            <div style={{
              position: 'absolute',
              width: 8,
              height: 8,
              background: '#1a1a2e',
              transform: 'rotate(45deg)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderTop: 'none',
              borderLeft: 'none',
              ...(position === 'top' ? { bottom: -5, left: '50%', marginLeft: -4 } : {}),
              ...(position === 'bottom' ? { top: -5, left: '50%', marginLeft: -4, borderTop: '1px solid rgba(102, 126, 234, 0.3)', borderLeft: '1px solid rgba(102, 126, 234, 0.3)', borderBottom: 'none', borderRight: 'none' } : {}),
              ...(position === 'left' ? { right: -5, top: '50%', marginTop: -4 } : {}),
              ...(position === 'right' ? { left: -5, top: '50%', marginTop: -4, borderTop: '1px solid rgba(102, 126, 234, 0.3)', borderLeft: '1px solid rgba(102, 126, 234, 0.3)', borderBottom: 'none', borderRight: 'none' } : {}),
            }} />
          )}
        </div>
      )}
    </div>
  );
}
