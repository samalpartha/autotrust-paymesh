'use client';

import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { playCopy } from '../lib/sounds';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'inline';
  showTooltip?: boolean;
}

export function CopyButton({ 
  text, 
  label, 
  size = 'md', 
  variant = 'icon',
  showTooltip = true 
}: CopyButtonProps) {
  const { isDark, t } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      playCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sizeStyles = {
    sm: { fontSize: 10, padding: '2px 6px', iconSize: 12 },
    md: { fontSize: 12, padding: '4px 8px', iconSize: 14 },
    lg: { fontSize: 14, padding: '6px 12px', iconSize: 16 },
  };

  const s = sizeStyles[size];

  if (variant === 'inline') {
    return (
      <span
        onClick={handleCopy}
        style={{
          cursor: 'pointer',
          color: copied ? '#22c55e' : (isDark ? '#888' : '#666'),
          marginLeft: 4,
          fontSize: s.iconSize,
          transition: 'color 0.2s',
        }}
        title={copied ? t('common.copied') : 'Copy'}
      >
        {copied ? '✓' : '📋'}
      </span>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: s.padding,
          fontSize: s.fontSize,
          background: copied 
            ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#d1fae5')
            : (isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'),
          border: `1px solid ${copied ? '#22c55e' : (isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb')}`,
          borderRadius: 6,
          color: copied ? '#22c55e' : (isDark ? '#a0a0b0' : '#666'),
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {copied ? '✓' : '📋'} {label || (copied ? t('common.copied') : 'Copy')}
      </button>
    );
  }

  // Icon variant (default)
  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.iconSize + 12,
        height: s.iconSize + 12,
        padding: 0,
        background: copied 
          ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#d1fae5')
          : 'transparent',
        border: 'none',
        borderRadius: 4,
        color: copied ? '#22c55e' : (isDark ? '#888' : '#666'),
        cursor: 'pointer',
        fontSize: s.iconSize,
        transition: 'all 0.2s',
      }}
      title={copied ? t('common.copied') : 'Copy to clipboard'}
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}

/**
 * Copyable text component - wraps text with inline copy button
 */
interface CopyableTextProps {
  text: string;
  displayText?: string;
  truncate?: number;
  mono?: boolean;
}

export function CopyableText({ text, displayText, truncate, mono = true }: CopyableTextProps) {
  const { isDark } = useTheme();
  
  let display = displayText || text;
  if (truncate && display.length > truncate) {
    display = display.slice(0, truncate) + '...';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: mono ? "'Monaco', 'Menlo', monospace" : 'inherit',
      fontSize: 'inherit',
    }}>
      <span style={{ color: isDark ? '#a0a0b0' : '#374151' }}>{display}</span>
      <CopyButton text={text} size="sm" variant="inline" />
    </span>
  );
}

/**
 * Address display with copy functionality
 */
interface AddressDisplayProps {
  address: string;
  label?: string;
  full?: boolean;
}

export function AddressDisplay({ address, label, full = false }: AddressDisplayProps) {
  const { isDark } = useTheme();
  
  const displayAddr = full 
    ? address 
    : `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {label && (
        <span style={{
          fontSize: 11,
          color: isDark ? '#666' : '#888',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {label}:
        </span>
      )}
      <span style={{
        fontFamily: "'Monaco', 'Menlo', monospace",
        fontSize: 13,
        color: isDark ? '#a0a0b0' : '#374151',
        background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
        padding: '4px 8px',
        borderRadius: 4,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {displayAddr}
        <CopyButton text={address} size="sm" variant="inline" />
      </span>
    </div>
  );
}
