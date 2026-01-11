'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    
    return id;
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast(message, 'error', duration ?? 6000), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast(message, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 400,
    }}>
      {toasts.map((toast, index) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onClose={() => removeToast(toast.id)}
          index={index}
        />
      ))}
    </div>
  );
}

// Individual Toast Component
function ToastItem({ toast, onClose, index }: { toast: Toast; onClose: () => void; index: number }) {
  const config = {
    success: { 
      bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)',
      border: '#22c55e',
      icon: '✅'
    },
    error: { 
      bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
      border: '#ef4444',
      icon: '❌'
    },
    warning: { 
      bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(234, 88, 12, 0.95) 100%)',
      border: '#f97316',
      icon: '⚠️'
    },
    info: { 
      bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(79, 70, 229, 0.95) 100%)',
      border: '#6366f1',
      icon: 'ℹ️'
    },
  };

  const style = config[toast.type];

  return (
    <div
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: 12,
        padding: '14px 18px',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        animation: 'slideIn 0.3s ease-out',
        backdropFilter: 'blur(10px)',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{style.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: 14, 
          fontWeight: 500, 
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: 6,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
