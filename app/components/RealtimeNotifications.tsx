'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import { playNotification } from '../lib/sounds';
import { BACKEND_URL } from '../lib/contracts';

interface EscrowEvent {
  id: string;
  type: 'created' | 'released' | 'refunded' | 'disputed';
  escrowId: string;
  amount: string;
  timestamp: number;
  txHash?: string;
}

interface NotificationContextType {
  notifications: EscrowEvent[];
  unreadCount: number;
  markAllRead: () => void;
  clearNotifications: () => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<EscrowEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  // Poll for new events (WebSocket alternative that works with current backend)
  const pollForEvents = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/events`);
      if (!response.ok) return;
      
      const data = await response.json();
      setIsConnected(true);
      
      if (data.events && data.events.length > 0) {
        const newEvents = data.events.filter((event: any) => {
          // Only show events we haven't seen
          const eventId = `${event.eventType}-${event.escrowId}-${event.blockNumber}`;
          return eventId !== lastEventId;
        });

        if (newEvents.length > 0) {
          const latestEvent = newEvents[0];
          const eventId = `${latestEvent.eventType}-${latestEvent.escrowId}-${latestEvent.blockNumber}`;
          
          // Check if this is truly new (not from initial load)
          if (lastEventId !== null) {
            const formattedEvent: EscrowEvent = {
              id: eventId,
              type: latestEvent.eventType.toLowerCase().replace('escrow', '') as EscrowEvent['type'],
              escrowId: latestEvent.escrowId,
              amount: latestEvent.amount,
              timestamp: Date.now(),
              txHash: latestEvent.txHash,
            };

            setNotifications(prev => [formattedEvent, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);
            playNotification();
          }
          
          setLastEventId(eventId);
        }
      }
    } catch (error) {
      setIsConnected(false);
    }
  }, [lastEventId]);

  // Start polling
  useEffect(() => {
    // Initial poll
    pollForEvents();

    // Poll every 5 seconds
    const interval = setInterval(pollForEvents, 5000);

    return () => clearInterval(interval);
  }, [pollForEvents]);

  const markAllRead = () => setUnreadCount(0);
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAllRead,
      clearNotifications,
      isConnected,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

/**
 * Notification Bell with dropdown
 */
export function NotificationBell() {
  const { isDark } = useTheme();
  const { notifications, unreadCount, markAllRead, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getEventIcon = (type: EscrowEvent['type']) => {
    switch (type) {
      case 'created': return '📝';
      case 'released': return '✅';
      case 'refunded': return '↩️';
      case 'disputed': return '⚠️';
      default: return '📌';
    }
  };

  const getEventColor = (type: EscrowEvent['type']) => {
    switch (type) {
      case 'created': return '#3b82f6';
      case 'released': return '#22c55e';
      case 'refunded': return '#f59e0b';
      case 'disputed': return '#ef4444';
      default: return '#666';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAllRead();
        }}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: 10,
          border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e7eb',
          background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
          color: isDark ? '#a0a0b0' : '#666',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: '#ef4444',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Connection indicator */}
        <span style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isConnected ? '#22c55e' : '#ef4444',
          border: `2px solid ${isDark ? '#1a1a2e' : '#fff'}`,
        }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 320,
            maxHeight: 400,
            background: isDark 
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
              : '#ffffff',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
            zIndex: 1000,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ 
                fontWeight: 600, 
                fontSize: 14,
                color: isDark ? '#fff' : '#111',
              }}>
                Notifications
              </span>
              <span style={{
                fontSize: 11,
                color: isConnected ? '#22c55e' : '#ef4444',
              }}>
                {isConnected ? '● Live' : '○ Offline'}
              </span>
            </div>

            {/* Notifications list */}
            <div style={{ 
              maxHeight: 320, 
              overflowY: 'auto',
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: 32,
                  textAlign: 'center',
                  color: isDark ? '#666' : '#999',
                  fontSize: 13,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: isDark 
                        ? '1px solid rgba(255,255,255,0.05)' 
                        : '1px solid #f3f4f6',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{
                      fontSize: 20,
                      lineHeight: 1,
                    }}>
                      {getEventIcon(notification.type)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: isDark ? '#fff' : '#111',
                        marginBottom: 2,
                      }}>
                        Escrow {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: isDark ? '#888' : '#666',
                        marginBottom: 4,
                      }}>
                        {notification.amount} MNEE
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: isDark ? '#555' : '#999',
                        fontFamily: 'monospace',
                      }}>
                        {notification.escrowId.slice(0, 16)}...
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: isDark ? '#555' : '#999',
                      whiteSpace: 'nowrap',
                    }}>
                      {getRelativeTime(notification.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
