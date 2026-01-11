'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  isDark?: boolean;
}

// Spider Web Logo with Ethereum diamond in center - inspired by the Ethereum web design
export function Logo({ size = 48, isDark = true }: LogoProps) {
  const webColor = isDark ? 'rgba(200, 210, 230, 0.4)' : 'rgba(99, 102, 241, 0.35)';
  const webHighlight = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(99, 102, 241, 0.5)';
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ethereum diamond gradient */}
        <linearGradient id="ethTop" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#88c0fc" />
          <stop offset="100%" stopColor="#627eea" />
        </linearGradient>
        <linearGradient id="ethBottom" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#627eea" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="ethLeft" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#c0d0f0" />
          <stop offset="100%" stopColor="#88c0fc" />
        </linearGradient>
        <linearGradient id="ethRight" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#627eea" />
        </linearGradient>
        {/* Center glow */}
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#88c0fc" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#627eea" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#627eea" stopOpacity="0" />
        </radialGradient>
        {/* Dew drop gradient */}
        <radialGradient id="dewDrop" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
        </radialGradient>
      </defs>

      {/* Spider web radial lines - 16 spokes */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 22.5 * Math.PI) / 180;
        return (
          <line
            key={`spoke-${i}`}
            x1="60"
            y1="60"
            x2={60 + 55 * Math.cos(angle)}
            y2={60 + 55 * Math.sin(angle)}
            stroke={webColor}
            strokeWidth="0.8"
          />
        );
      })}

      {/* Spider web spiral/concentric arcs */}
      {[15, 25, 35, 45, 55].map((r, ringIndex) => (
        <g key={`ring-${ringIndex}`}>
          {Array.from({ length: 16 }).map((_, i) => {
            const startAngle = (i * 22.5 * Math.PI) / 180;
            const endAngle = ((i + 1) * 22.5 * Math.PI) / 180;
            const x1 = 60 + r * Math.cos(startAngle);
            const y1 = 60 + r * Math.sin(startAngle);
            const x2 = 60 + r * Math.cos(endAngle);
            const y2 = 60 + r * Math.sin(endAngle);
            return (
              <path
                key={`arc-${ringIndex}-${i}`}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                stroke={i % 4 === 0 ? webHighlight : webColor}
                strokeWidth="0.8"
                fill="none"
              />
            );
          })}
        </g>
      ))}

      {/* Dew drops on web */}
      {[
        { x: 30, y: 25 }, { x: 90, y: 30 }, { x: 20, y: 70 }, 
        { x: 95, y: 80 }, { x: 35, y: 95 }, { x: 85, y: 95 },
        { x: 15, y: 45 }, { x: 105, y: 55 }
      ].map((pos, i) => (
        <circle
          key={`dew-${i}`}
          cx={pos.x}
          cy={pos.y}
          r={2 + (i % 2)}
          fill="url(#dewDrop)"
          opacity={0.6 + (i % 3) * 0.15}
        />
      ))}

      {/* Center glow */}
      <circle cx="60" cy="60" r="22" fill="url(#centerGlow)" />

      {/* Ethereum Diamond */}
      <g transform="translate(60, 60)">
        {/* Top left facet */}
        <polygon 
          points="0,-18 -12,0 0,-3" 
          fill="url(#ethLeft)" 
          opacity="0.95"
        />
        {/* Top right facet */}
        <polygon 
          points="0,-18 12,0 0,-3" 
          fill="url(#ethTop)" 
          opacity="0.95"
        />
        {/* Bottom left facet */}
        <polygon 
          points="0,18 -12,0 0,-3" 
          fill="url(#ethBottom)" 
          opacity="0.9"
        />
        {/* Bottom right facet */}
        <polygon 
          points="0,18 12,0 0,-3" 
          fill="url(#ethRight)" 
          opacity="0.85"
        />
        {/* Center highlight line */}
        <line 
          x1="0" y1="-18" 
          x2="0" y2="18" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="0.5"
        />
      </g>

      {/* Sparkle effects */}
      {[
        { x: 45, y: 42, size: 3 },
        { x: 78, y: 48, size: 2 },
        { x: 52, y: 78, size: 2 },
      ].map((s, i) => (
        <g key={`sparkle-${i}`}>
          <line 
            x1={s.x - s.size} y1={s.y} 
            x2={s.x + s.size} y2={s.y} 
            stroke="white" strokeWidth="1" opacity="0.8"
          />
          <line 
            x1={s.x} y1={s.y - s.size} 
            x2={s.x} y2={s.y + s.size} 
            stroke="white" strokeWidth="1" opacity="0.8"
          />
        </g>
      ))}
    </svg>
  );
}

// Large hero logo for landing page
export function HeroLogo({ size = 120, isDark = true }: LogoProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      marginBottom: 24,
    }}>
      <Logo size={size} isDark={isDark} />
    </div>
  );
}

export function LogoWithText({ size = 48, isDark = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Logo size={size} isDark={isDark} />
      <div>
        <div style={{ 
          fontSize: size * 0.35, 
          fontWeight: 800, 
          fontFamily: "'Space Grotesk', system-ui",
          background: isDark 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.1,
        }}>
          PayMesh
        </div>
        <div style={{ 
          fontSize: size * 0.2, 
          color: isDark ? '#888' : '#64748b',
          fontWeight: 500,
          letterSpacing: 1,
        }}>
          AutoTrust
        </div>
      </div>
    </div>
  );
}
