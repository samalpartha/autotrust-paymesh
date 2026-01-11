'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Tooltip } from './Tooltip';

export function ThemeToggle() {
  const { isDark, toggleTheme, language, setLanguage, t } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Language Toggle */}
      <Tooltip content={language === 'en' ? t('tooltip.langEs') : t('tooltip.langEn')} position="bottom">
        <button
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e7eb',
            background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
            color: isDark ? '#a0a0b0' : '#666',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          🌐 {language.toUpperCase()}
        </button>
      </Tooltip>

      {/* Theme Toggle */}
      <Tooltip content={isDark ? t('tooltip.lightMode') : t('tooltip.darkMode')} position="bottom">
        <button
          onClick={toggleTheme}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e7eb',
            background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
            color: isDark ? '#f59e0b' : '#6366f1',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </Tooltip>
    </div>
  );
}
