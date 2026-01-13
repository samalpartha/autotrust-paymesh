'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../lib/config';

interface Stream {
  id: string;
  sender: string;
  receiver: string;
  ratePerSecond: number;
  totalBudget: number;
  status: string;
  startTime: number;
  withdrawn: number;
  streamedAmount?: number;
  withdrawable?: number;
  remaining?: number;
  progress?: number;
}



export function StreamingPayments({ isDark = true }: { isDark?: boolean }) {
  const [stream, setStream] = useState<Stream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null); // null = loading from backend
  const [receiverBalance, setReceiverBalance] = useState<number>(0);
  const [walletHistory, setWalletHistory] = useState<string[]>([]);

  // Config form
  const [sender, setSender] = useState('0x742d...8aB12');
  const [receiver, setReceiver] = useState('0x8ba1...DBA72');
  const [ratePerSecond, setRatePerSecond] = useState('0.05');
  const [totalBudget, setTotalBudget] = useState('100');

  // Fetch wallet balance from backend (SINGLE SOURCE OF TRUTH)
  const fetchWalletBalance = async (): Promise<number> => {
    try {
      const res = await fetch(`${BACKEND_URL}/streams/wallet/${sender}`);
      const data = await res.json();
      if (data.success) {
        console.log(`[Wallet] Backend balance: ${data.balance}`);
        setWalletBalance(data.balance);
        return data.balance;
      }
    } catch {
      console.log('[Wallet] Backend unavailable');
    }
    return walletBalance || 100;
  };

  // Animation
  const [streamedAmount, setStreamedAmount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tokens, setTokens] = useState<{ id: number; x: number }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenIdRef = useRef(0);

  // Start stream via backend (REAL DATA ONLY)
  const startStream = async () => {
    setError(null);
    setSuccess(null);

    // Get current balance from backend FIRST
    const currentBalance = await fetchWalletBalance();
    const budgetToUse = parseFloat(totalBudget);

    if (currentBalance < budgetToUse) {
      setError(`Insufficient balance: ${currentBalance.toFixed(2)} MNEE (need ${budgetToUse})`);
      return;
    }

    console.log(`[StartStream] Backend balance: ${currentBalance}, locking: ${budgetToUse}`);

    try {
      const res = await fetch(`${BACKEND_URL}/streams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          receiver,
          ratePerSecond: parseFloat(ratePerSecond),
          totalBudget: budgetToUse,
          description: 'AI Service Streaming Payment'
        })
      });

      const data = await res.json();
      console.log(`[StartStream] Response:`, data);

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to create stream');
        return;
      }

      if (data.success) {
        setStream(data.stream);
        setIsLive(true);
        setIsStreaming(true);
        setStreamedAmount(0);
        setElapsedSeconds(0);
        setTokens([]);
        // Update wallet balance from backend response (ALWAYS trust backend)
        const locked = data.lockedInStream || data.stream.totalBudget;
        const newBalance = data.walletBalance;
        console.log(`[StartStream] Locked ${locked}, new balance: ${newBalance}`);
        setWalletBalance(newBalance);
        setWalletHistory(prev => [...prev.slice(-4), `-${locked.toFixed(0)} locked → ${newBalance.toFixed(0)}`]);
        setSuccess(`🔒 Locked ${locked.toFixed(0)} MNEE. Balance: ${newBalance.toFixed(0)} MNEE`);
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('[StartStream] Error:', err);
      setError('Backend unavailable. Please ensure the backend server is running.');
      setIsLive(false);
    }
  };

  // Stop/cancel stream
  const stopStream = async () => {
    if (stream && isLive) {
      try {
        const res = await fetch(`${BACKEND_URL}/streams/${stream.id}/cancel`, { method: 'POST' });
        const data = await res.json();

        // Update with final values from backend
        if (data.stream) {
          const finalStreamed = data.stream.finalStreamed || 0;
          setStreamedAmount(finalStreamed);
          setStream({
            ...data.stream,
            withdrawn: data.stream.withdrawn || 0
          });
        }

        // Update wallet balance from backend response (ALWAYS trust backend)
        const newBalance = data.walletBalance;
        const refunded = data.refunded || 0;
        console.log(`[StopStream] Refunded ${refunded}, new balance: ${newBalance}`);
        setWalletBalance(newBalance);
        if (refunded > 0) {
          setWalletHistory(prev => [...prev.slice(-4), `+${refunded.toFixed(1)} refund → ${newBalance.toFixed(0)}`]);
          setSuccess(`⏹️ Refunded ${refunded.toFixed(2)} MNEE. Balance: ${newBalance.toFixed(0)} MNEE`);
          setTimeout(() => setSuccess(null), 5000);
        }
      } catch {
        console.log('Could not cancel on backend');
      }
    }

    setIsStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Withdraw funds (receiver) - works for active and cancelled streams
  const withdrawFunds = async () => {
    if (!stream) {
      setError('No active stream to withdraw from');
      return;
    }
    setError(null);
    setSuccess(null);

    console.log(`[Withdraw] Attempting withdrawal from stream ${stream.id}`);

    try {
      const res = await fetch(`${BACKEND_URL}/streams/${stream.id}/withdraw`, { method: 'POST' });
      const data = await res.json();
      console.log(`[Withdraw] Response:`, data);

      if (data.success) {
        // Update stream with new withdrawn amount - Available becomes 0 after full withdrawal
        setStream(prev => prev ? {
          ...prev,
          withdrawn: data.totalWithdrawn,
          status: data.status
        } : null);
        // Update streamedAmount to match (for cancelled streams)
        if (stream.status === 'cancelled') {
          setStreamedAmount(data.totalWithdrawn);
        }
        // Add to receiver's balance (withdrawals go to receiver, NOT sender)
        const newReceiverBalance = receiverBalance + data.withdrawn;
        console.log(`[Withdraw] RECEIVER: ${receiverBalance} + ${data.withdrawn} = ${newReceiverBalance}`);
        setReceiverBalance(newReceiverBalance);
        setWalletHistory(prev => [...prev.slice(-9), `RECEIVER +${data.withdrawn.toFixed(2)}`]);
        // Show success message
        setSuccess(`✅ RECEIVER: +${data.withdrawn.toFixed(2)} MNEE withdrawn! Total: ${newReceiverBalance.toFixed(2)} MNEE`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        console.error(`[Withdraw] Failed:`, data.error);
        setError(data.error || 'Withdraw failed');
      }
    } catch (err) {
      console.error('[Withdraw] Error:', err);
      setError('Withdraw failed - backend unavailable');
    }
  };

  // Poll stream status from backend
  useEffect(() => {
    if (!stream || !isLive || !isStreaming) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/streams/${stream.id}`);
        const data = await res.json();
        if (data.success) {
          setStreamedAmount(data.stream.streamedAmount);
          setElapsedSeconds(data.stream.elapsedSeconds);
          setStream(data.stream);

          if (data.stream.status !== 'active') {
            setIsStreaming(false);
          }
        }
      } catch (err) {
        console.log('Poll error');
      }
    };

    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [stream, isLive, isStreaming]);

  // Token animation for streaming (visual only - data comes from backend)
  useEffect(() => {
    if (isStreaming && stream && isLive) {
      intervalRef.current = setInterval(() => {
        // Add floating token animation
        if (Math.random() > 0.7) {
          setTokens(prev => [...prev, { id: tokenIdRef.current++, x: Math.random() * 80 + 10 }]);
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, stream, isLive]);

  // Clean up old tokens
  useEffect(() => {
    const cleanup = setInterval(() => {
      setTokens(prev => prev.slice(-20));
    }, 2000);
    return () => clearInterval(cleanup);
  }, []);

  // Fetch wallet balance on mount and when sender changes
  useEffect(() => {
    fetchWalletBalance();
    // Also check backend availability
    const checkBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (res.ok) setIsLive(true);
      } catch {
        setIsLive(false);
      }
    };
    checkBackend();
  }, [sender]);

  const budget = stream?.totalBudget || parseFloat(totalBudget);
  const rate = stream?.ratePerSecond || parseFloat(ratePerSecond);
  const progress = (streamedAmount / budget) * 100;
  const remainingBudget = budget - streamedAmount;
  const estimatedTime = remainingBudget / rate;

  return (
    <div style={{
      borderRadius: 20,
      background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        background: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>💸 Streaming Payments</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#888' : '#64748b' }}>
              {isLive ? '✅ Live stream active on backend' : isStreaming ? '⏳ Starting stream...' : '💡 Configure and start a stream below'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isLive && (
              <div style={{
                padding: '4px 8px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                fontSize: 10,
                fontWeight: 600,
              }}>
                LIVE API
              </div>
            )}
            <div style={{
              padding: '6px 12px',
              borderRadius: 20,
              background: isStreaming ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
              color: isStreaming ? '#22c55e' : '#6b7280',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isStreaming ? '#22c55e' : '#6b7280',
                animation: isStreaming ? 'pulse 1s infinite' : 'none',
              }} />
              {isStreaming ? 'STREAMING' : stream?.status === 'completed' ? 'COMPLETED' : 'IDLE'}
            </div>
          </div>
        </div>
      </div>

      {/* Stream Visualization */}
      <div style={{
        padding: 20,
        position: 'relative',
        minHeight: 180,
        overflow: 'hidden',
      }}>
        {/* Animated tokens */}
        {isStreaming && tokens.map(token => (
          <div
            key={token.id}
            style={{
              position: 'absolute',
              left: `${token.x}%`,
              fontSize: 16,
              animation: 'floatUp 2s ease-out forwards',
              opacity: 0.8,
            }}
          >
            💰
          </div>
        ))}

        <style>{`
          @keyframes floatUp {
            0% { top: 80%; opacity: 0.8; transform: scale(1); }
            100% { top: 10%; opacity: 0; transform: scale(0.5); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes flowRight {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>

        {/* Sender -> Receiver Flow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          {/* Sender */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: isDark ? 'rgba(102, 126, 234, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              border: `2px solid ${isDark ? '#667eea' : '#6366f1'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 8px',
            }}>
              🤖
            </div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Sender</div>
            <div style={{ fontSize: 10, fontFamily: 'ui-monospace', color: isDark ? '#666' : '#94a3b8' }}>
              {sender}
            </div>
          </div>

          {/* Flow Animation */}
          <div style={{
            flex: 1,
            height: 40,
            margin: '0 20px',
            position: 'relative',
            borderRadius: 20,
            background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
            overflow: 'hidden',
          }}>
            {/* Progress bar */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${Math.min(100, progress)}%`,
              background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
              transition: 'width 0.1s linear',
              borderRadius: 20,
            }} />

            {/* Flowing particles */}
            {isStreaming && (
              <>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#f59e0b',
                      animation: `flowRight 1.5s linear infinite`,
                      animationDelay: `${i * 0.5}s`,
                      boxShadow: '0 0 10px #f59e0b',
                    }}
                  />
                ))}
              </>
            )}

            {/* Rate label */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12,
              fontWeight: 700,
              color: progress > 50 ? '#fff' : (isDark ? '#e0e0e0' : '#333'),
              textShadow: progress > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              zIndex: 10,
            }}>
              {rate} MNEE/sec
            </div>
          </div>

          {/* Receiver */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
              border: `2px solid #22c55e`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 8px',
            }}>
              🧠
            </div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Receiver</div>
            <div style={{ fontSize: 10, fontFamily: 'ui-monospace', color: isDark ? '#666' : '#94a3b8' }}>
              {receiver}
            </div>
          </div>
        </div>

        {/* Clear Balance Display: SENDER → LOCKED → RECEIVER */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}>
          {/* Sender Wallet */}
          <div style={{
            padding: 12,
            background: isDark ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.08)',
            borderRadius: 12,
            border: `2px solid #667eea`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#667eea', fontWeight: 700, marginBottom: 2 }}>💰 WALLET</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#667eea' }}>
              {walletBalance !== null ? walletBalance.toFixed(0) : '...'}
            </div>
            <div style={{ fontSize: 9, color: isDark ? '#888' : '#666' }}>Available</div>
          </div>

          {/* Locked in Stream */}
          <div style={{
            padding: 12,
            background: isStreaming
              ? (isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)')
              : (isDark ? 'rgba(100,100,100,0.1)' : 'rgba(100,100,100,0.05)'),
            borderRadius: 12,
            border: `2px solid ${isStreaming ? '#f97316' : '#666'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: isStreaming ? '#f97316' : '#888', fontWeight: 700, marginBottom: 2 }}>🔒 LOCKED</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isStreaming ? '#f97316' : '#888' }}>
              {stream ? (stream.totalBudget - streamedAmount).toFixed(0) : '0'}
            </div>
            <div style={{ fontSize: 9, color: isDark ? '#888' : '#666' }}>In Stream</div>
          </div>

          {/* Receiver Balance */}
          <div style={{
            padding: 12,
            background: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)',
            borderRadius: 12,
            border: `2px solid #22c55e`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 2 }}>🤖 RECEIVER</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>
              {receiverBalance.toFixed(2)}
            </div>
            <div style={{ fontSize: 9, color: isDark ? '#888' : '#666' }}>Earned</div>
          </div>
        </div>

        {/* Money Flow Visualization */}
        {isStreaming && (
          <div style={{
            textAlign: 'center',
            fontSize: 11,
            color: isDark ? '#888' : '#666',
            marginBottom: 8,
            padding: '4px 8px',
            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
            borderRadius: 6,
          }}>
            💰 Wallet <span style={{ color: '#667eea' }}>→</span> 🔒 Locked <span style={{ color: '#f97316' }}>→</span> 📤 Streamed <span style={{ color: '#22c55e' }}>→</span> 🤖 Receiver
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={async () => {
              if (!confirm('Add 100 MNEE to SENDER wallet?')) return;
              try {
                await fetch(`${BACKEND_URL}/streams/wallet/${sender}/deposit`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ amount: 100 })
                });
                await fetchWalletBalance();
                setWalletHistory(prev => [...prev.slice(-9), `SENDER +100`]);
                setSuccess('💰 +100 to Sender!');
                setTimeout(() => setSuccess(null), 3000);
              } catch { setError('Failed'); }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: '#667eea',
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            +100 to Sender
          </button>
          <button
            onClick={async () => {
              if (!confirm('RESET: Set sender wallet to exactly 100 MNEE and clear all streams?')) return;
              try {
                // Reset backend wallet and streams
                const res = await fetch(`${BACKEND_URL}/streams/wallet/${sender}/reset`, { method: 'POST' });
                const data = await res.json();
                console.log('[Reset] Backend response:', data);

                // Verify reset worked by fetching balance
                const newBalance = await fetchWalletBalance();
                console.log('[Reset] Verified balance:', newBalance);

                // Reset frontend state
                setReceiverBalance(0);
                setWalletHistory(['🔄 RESET']);
                setStream(null);
                setIsStreaming(false);
                setStreamedAmount(0);
                setElapsedSeconds(0);
                setTokens([]);
                setSuccess(`🔄 Reset complete! Balance: ${newBalance.toFixed(0)} MNEE`);
                setTimeout(() => setSuccess(null), 3000);
              } catch (err) {
                console.error('[Reset] Error:', err);
                setError('Reset failed - backend may be down');
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: '#f59e0b',
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            🔄 Reset Demo
          </button>
        </div>

        {/* How It Works - Clear Explanation */}
        <div style={{
          fontSize: 10,
          color: isDark ? '#888' : '#666',
          marginBottom: 12,
          padding: '8px 12px',
          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
          borderRadius: 8,
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>💡 MONEY FLOW:</div>
          <div>1. <b>Start</b> → 💰 Wallet (100) moves to 🔒 Locked (100) — <span style={{ color: '#667eea' }}>Wallet shows 0!</span></div>
          <div>2. <b>Streaming</b> → 🔒 Locked slowly moves to 📤 Streamed</div>
          <div>3. <b>Withdraw</b> → 📤 Streamed moves to 🤖 Receiver balance</div>
          <div>4. <b>Stop</b> → 🔒 Remaining Locked returns to 💰 Wallet</div>
        </div>

        {/* Transaction Log */}
        {walletHistory.length > 0 && (
          <div style={{
            fontSize: 10,
            color: isDark ? '#888' : '#666',
            marginBottom: 12,
            padding: '6px 10px',
            background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)',
            borderRadius: 6,
          }}>
            <span style={{ fontWeight: 600 }}>Log: </span>
            {walletHistory.slice(-3).join(' → ')}
          </div>
        )}

        {/* Stats - Row 1: Amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <StatBox label="Streamed" value={`${streamedAmount.toFixed(2)} MNEE`} color="#22c55e" isDark={isDark} />
          <StatBox label="Withdrawn" value={`${(stream?.withdrawn || 0).toFixed(2)} MNEE`} color="#3b82f6" isDark={isDark} />
          <StatBox label="Available" value={`${Math.max(0, streamedAmount - (stream?.withdrawn || 0)).toFixed(2)} MNEE`} color="#f59e0b" isDark={isDark} />
        </div>

        {/* Stats - Row 2: Time */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <StatBox label="Remaining Budget" value={`${remainingBudget.toFixed(2)} MNEE`} color="#888" isDark={isDark} />
          <StatBox label="Elapsed" value={`${elapsedSeconds.toFixed(1)}s`} color="#667eea" isDark={isDark} />
          <StatBox label="ETA" value={isStreaming ? `${Math.ceil(estimatedTime)}s` : '--'} color="#888" isDark={isDark} />
        </div>

        {stream?.id && (
          <div style={{ marginTop: 12, fontSize: 11, color: isDark ? '#555' : '#94a3b8', textAlign: 'center' }}>
            Stream ID: {stream.id}
          </div>
        )}
      </div>

      {/* Use Case */}
      <div style={{
        padding: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
        background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: isDark ? '#888' : '#64748b' }}>
          💡 IDEAL FOR
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['LLM Inference', 'GPU Compute', 'API Calls', 'Data Processing', 'Real-time Translation'].map(useCase => (
            <span key={useCase} style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              fontSize: 11,
              color: isDark ? '#a0a0b0' : '#64748b',
            }}>
              {useCase}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 16, display: 'flex', gap: 12, flexDirection: 'column' }}>
        {/* Show withdraw button if there are unwithdrawn funds (even after stopping) */}
        {stream && streamedAmount > (stream.withdrawn || 0) && (
          <button
            onClick={withdrawFunds}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: '1px solid rgba(34, 197, 94, 0.5)',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            💰 Withdraw Available: {(streamedAmount - (stream?.withdrawn || 0)).toFixed(2)} MNEE
          </button>
        )}

        {/* Streaming controls */}
        <div style={{ display: 'flex', gap: 12 }}>
          {!isStreaming ? (
            <button
              onClick={startStream}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              }}
            >
              {stream?.status === 'cancelled' || stream?.status === 'completed' ? '🔄 Start New Stream' : '▶️ Start Stream'}
            </button>
          ) : (
            <button
              onClick={stopStream}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⏹️ Stop Stream
            </button>
          )}
        </div>

        {/* Status after stopping */}
        {!isStreaming && stream && (stream.status === 'cancelled' || stream.status === 'completed') && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: stream.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${stream.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            textAlign: 'center',
            fontSize: 12
          }}>
            <div style={{ fontWeight: 600, color: stream.status === 'completed' ? '#22c55e' : '#f59e0b', marginBottom: 4 }}>
              {stream.status === 'completed' ? '✅ Stream Completed' : '⏹️ Stream Stopped'}
            </div>
            <div style={{ color: isDark ? '#888' : '#666' }}>
              Total streamed: {streamedAmount.toFixed(2)} MNEE | Withdrawn: {(stream.withdrawn || 0).toFixed(2)} MNEE
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0 16px 16px', color: '#ef4444', fontSize: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '0 16px 16px', color: '#22c55e', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>
          {success}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, isDark }: { label: string; value: string; color: string; isDark: boolean }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 12,
      background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: isDark ? '#666' : '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  );
}
