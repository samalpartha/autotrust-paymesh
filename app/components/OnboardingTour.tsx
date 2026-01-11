'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="demo-tab"]',
    title: '👋 Welcome to PayMesh!',
    content: 'Start here! The Demo tab lets you explore AI-powered escrow features without connecting a wallet.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wallet-connect"]',
    title: '💳 Connect Your Wallet',
    content: 'Connect MetaMask or another wallet to interact with real escrows on the blockchain.',
    position: 'bottom',
  },
  {
    target: '[data-tour="escrow-tab"]',
    title: '🔒 Create Escrows',
    content: 'The Escrow tab is where you create, fund, release, and refund escrows.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ai-tab"]',
    title: '🤖 AI Agent Decisions',
    content: 'Get intelligent recommendations from our multi-agent AI system for each escrow.',
    position: 'bottom',
  },
  {
    target: '[data-tour="meshmind-tab"]',
    title: '🧠 MeshMind Assistant',
    content: 'Ask questions in plain language. MeshMind knows everything about the platform!',
    position: 'bottom',
  },
  {
    target: '[data-tour="advanced-tab"]',
    title: '🚀 Advanced Features',
    content: 'Explore negotiation, reputation scoring, streaming payments, and AI arbitration.',
    position: 'bottom',
  },
  {
    target: '[data-tour="help-button"]',
    title: '❓ Need Help?',
    content: 'Click here anytime for detailed documentation and guides. Enjoy PayMesh!',
    position: 'left',
  },
];

export function OnboardingTour() {
  const { isDark, t } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if this is the user's first visit
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      // Delay tour start to let page render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!isActive) return;
    
    const step = TOUR_STEPS[currentStep];
    const target = document.querySelector(step.target);
    
    if (target) {
      setTargetRect(target.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    
    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsActive(false);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const skipTour = () => {
    completeTour();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  
  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const padding = 16;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding;
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    }

    // Keep within viewport
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = window.innerHeight - tooltipHeight - padding;
    }

    return {
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
    };
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          transition: 'opacity 0.3s',
        }}
        onClick={skipTour}
      />

      {/* Spotlight on target element */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            zIndex: 9998,
            pointerEvents: 'none',
            border: '2px solid #667eea',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          ...getTooltipStyle(),
          background: isDark 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
        }}
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: isDark ? '#fff' : '#111',
            margin: 0,
          }}>
            {step.title}
          </h3>
          <button
            onClick={skipTour}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#666' : '#999',
              cursor: 'pointer',
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <p style={{ 
          fontSize: 14, 
          color: isDark ? '#a0a0b0' : '#666',
          lineHeight: 1.5,
          marginBottom: 16,
        }}>
          {step.content}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === currentStep 
                    ? '#667eea' 
                    : (isDark ? 'rgba(255,255,255,0.2)' : '#e5e7eb'),
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e7eb',
                  background: 'transparent',
                  color: isDark ? '#a0a0b0' : '#666',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Let's Go!" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manually trigger tour
 */
export function useTour() {
  const startTour = () => {
    localStorage.removeItem('hasSeenTour');
    window.location.reload();
  };

  const resetTour = () => {
    localStorage.removeItem('hasSeenTour');
  };

  return { startTour, resetTour };
}

/**
 * Button to restart tour
 */
export function TourRestartButton() {
  const { isDark } = useTheme();
  const { startTour } = useTour();

  return (
    <button
      onClick={startTour}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 8,
        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e7eb',
        background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
        color: isDark ? '#a0a0b0' : '#666',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      🎓 Restart Tour
    </button>
  );
}
