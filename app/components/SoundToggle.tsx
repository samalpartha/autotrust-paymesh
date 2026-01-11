'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { soundManager, playClick } from '../lib/sounds';
import { Tooltip } from './Tooltip';

export function SoundToggle() {
  const { isDark } = useTheme();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundManager.isEnabled());
  }, []);

  const toggle = () => {
    const newState = !enabled;
    soundManager.setEnabled(newState);
    setEnabled(newState);
    if (newState) {
      playClick(); // Play a sound to confirm it's enabled
    }
  };

  return (
    <Tooltip content={enabled ? 'Mute Sounds' : 'Enable Sounds'} position="bottom">
      <button
        onClick={toggle}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e7eb',
          background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
          color: enabled 
            ? (isDark ? '#22c55e' : '#16a34a')
            : (isDark ? '#666' : '#999'),
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {enabled ? '🔊' : '🔇'}
      </button>
    </Tooltip>
  );
}
