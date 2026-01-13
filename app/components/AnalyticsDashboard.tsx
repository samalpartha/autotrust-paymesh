'use client';

import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../lib/config';

interface ProtocolMetrics {
  tvl: string;
  totalVolume: string;
  activeEscrows: number;
  totalAgents: number;
  registeredAgents: number;
  avgSettlementTime: string;
  successRate: number;
  disputeRate: number;
  aiDecisions: number;
  ruleDecisions: number;
  totalDecisions: number;
}

interface RecentActivity {
  type: string;
  escrowId: string;
  amount: string | null;
  timeAgo: string;
}



export function AnalyticsDashboard({ isDark = true }: { isDark?: boolean }) {
  const [metrics, setMetrics] = useState<ProtocolMetrics | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatedTVL, setAnimatedTVL] = useState(0);
  const [animatedVolume, setAnimatedVolume] = useState(0);

  // Fetch real analytics
  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();

      if (data.success) {
        setMetrics(data.metrics);
        setActivity(data.recentActivity || []);
        setIsLive(data.isLive);
        setError(null);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Could not connect to backend');
      // Use fallback data
      setMetrics({
        tvl: '0',
        totalVolume: '0',
        activeEscrows: 0,
        totalAgents: 0,
        registeredAgents: 0,
        avgSettlementTime: 'N/A',
        successRate: 0,
        disputeRate: 0,
        aiDecisions: 0,
        ruleDecisions: 0,
        totalDecisions: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Animate numbers when metrics change
  useEffect(() => {
    if (!metrics) return;

    const tvlNum = parseFloat(metrics.tvl) || 0;
    const volNum = parseFloat(metrics.totalVolume) || 0;

    const duration = 1000;
    const steps = 30;
    const tvlStep = tvlNum / steps;
    const volStep = volNum / steps;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      setAnimatedTVL(Math.min(tvlStep * current, tvlNum));
      setAnimatedVolume(Math.min(volStep * current, volNum));
      if (current >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [metrics]);

  if (loading) {
    return (
      <div style={{
        borderRadius: 20,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>📊</div>
        <div style={{ color: isDark ? '#888' : '#64748b' }}>Loading analytics...</div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

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
        background: isDark
          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))'
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📊 Protocol Analytics</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#888' : '#64748b' }}>
              {isLive ? 'Real-time metrics from contract & events' : 'Connecting to backend...'}
            </p>
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: 20,
            background: isLive ? 'rgba(34, 197, 94, 0.15)' : error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: isLive ? '#22c55e' : error ? '#ef4444' : '#f59e0b',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isLive ? '#22c55e' : error ? '#ef4444' : '#f59e0b',
              animation: isLive ? 'pulse 2s infinite' : 'none',
            }} />
            {isLive ? 'LIVE' : error ? 'OFFLINE' : 'CONNECTING'}
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      <div style={{ padding: 20 }}>
        {/* No Data Notice */}
        {metrics && !metrics.activeEscrows && !metrics.totalAgents && parseFloat(metrics.totalVolume) === 0 && (
          <div style={{
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>No Protocol Activity Yet</div>
            <div style={{ fontSize: 12, color: isDark ? '#a0a0b0' : '#64748b', lineHeight: 1.6 }}>
              <strong>To see real metrics:</strong><br />
              1. Go to "Demo" tab → Load Sample Escrow<br />
              2. Or create real escrows via the "Escrow" tab<br />
              3. Register agents in "Advanced" → Agent Reputation
            </div>
          </div>
        )}

        {/* Hero Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
          <HeroMetric
            label="Total Value Locked"
            value={formatNumber(animatedTVL)}
            subValue="MNEE"
            change={metrics?.activeEscrows ? `${metrics.activeEscrows} active` : 'No active escrows'}
            positive={!!metrics?.activeEscrows}
            isDark={isDark}
          />
          <HeroMetric
            label="Total Volume (All Time)"
            value={formatNumber(animatedVolume)}
            subValue="MNEE"
            change={metrics ? (metrics.totalAgents ? `${metrics.totalAgents} addresses` : 'No transactions yet') : ''}
            positive={!!metrics?.totalAgents}
            isDark={isDark}
          />
        </div>

        {/* Secondary Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <MetricCard label="Active Escrows" value={metrics?.activeEscrows?.toString() || '0'} icon="🔒" isDark={isDark} />
          <MetricCard label="Registered Agents" value={metrics?.registeredAgents?.toString() || '0'} icon="🤖" isDark={isDark} />
          <MetricCard label="Avg Settlement" value={metrics?.avgSettlementTime || 'N/A'} icon="⏱️" isDark={isDark} />
          <MetricCard label="Success Rate" value={`${metrics?.successRate || 0}%`} icon="✅" isDark={isDark} />
        </div>

        {/* AI Performance */}
        <div style={{
          padding: 16,
          borderRadius: 16,
          background: isDark ? 'rgba(102, 126, 234, 0.1)' : 'rgba(99, 102, 241, 0.05)',
          border: `1px solid ${isDark ? 'rgba(102, 126, 234, 0.2)' : 'rgba(99, 102, 241, 0.15)'}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? '#667eea' : '#6366f1' }}>
            🧠 AI AGENT PERFORMANCE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#e0e0e0' : '#111' }}>
                {metrics?.totalDecisions || 0}
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#888' : '#64748b' }}>
                Total Decisions ({metrics?.aiDecisions || 0} AI / {metrics?.ruleDecisions || 0} Rule)
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>
                {metrics?.disputeRate || 0}%
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#888' : '#64748b' }}>Dispute Rate</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
                {metrics?.registeredAgents || 0}
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#888' : '#64748b' }}>Registered Agents</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        padding: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
        background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, color: isDark ? '#888' : '#64748b' }}>
          ⚡ RECENT ACTIVITY {isLive && <span style={{ color: '#22c55e' }}>(LIVE)</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activity.length > 0 ? activity.slice(0, 5).map((act, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb'}`,
              fontSize: 12,
            }}>
              <span style={{ color: isDark ? '#a0a0b0' : '#4b5563' }}>
                {getActivityIcon(act.type)} {act.type}: {act.escrowId} {act.amount && `(${act.amount})`}
              </span>
              <span style={{ color: isDark ? '#555' : '#94a3b8', fontSize: 11 }}>{act.timeAgo}</span>
            </div>
          )) : (
            <div style={{
              textAlign: 'center',
              padding: 20,
              color: isDark ? '#666' : '#94a3b8',
              fontSize: 13,
            }}>
              No recent activity. Create an escrow to see events here!
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'EscrowCreated': return '📝';
    case 'EscrowReleased': return '✅';
    case 'EscrowRefunded': return '↩️';
    case 'EscrowDisputed': return '⚠️';
    default: return '📌';
  }
}

function HeroMetric({
  label,
  value,
  subValue,
  change,
  positive,
  isDark
}: {
  label: string;
  value: string;
  subValue: string;
  change: string;
  positive: boolean;
  isDark: boolean;
}) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      background: isDark
        ? 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
        : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    }}>
      <div style={{ fontSize: 11, color: isDark ? '#888' : '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: isDark ? '#e0e0e0' : '#111' }}>{value}</span>
        <span style={{ fontSize: 16, color: isDark ? '#666' : '#94a3b8' }}>{subValue}</span>
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 12,
        fontWeight: 600,
        color: positive ? '#22c55e' : '#6b7280',
      }}>
        {change}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, isDark }: { label: string; value: string; icon: string; isDark: boolean }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#e0e0e0' : '#111' }}>{value}</div>
      <div style={{ fontSize: 10, color: isDark ? '#666' : '#94a3b8', marginTop: 4 }}>{label}</div>
    </div>
  );
}
