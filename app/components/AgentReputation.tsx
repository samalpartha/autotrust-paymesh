'use client';

import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

// Agent Trust Tiers
export type TrustTier = 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AgentProfile {
  address: string;
  name?: string;
  tier: TrustTier;
  score: number; // 0-100
  stats: {
    totalEscrows: number;
    successfulReleases: number;
    disputesWon: number;
    disputesLost: number;
    avgResponseTime?: string;
    totalVolume: string;
  };
  badges: string[];
  joinedDate?: string;
  registeredAt?: number;
  lastActive?: number;
}

const TIER_CONFIG: Record<TrustTier, { color: string; bg: string; icon: string; label: string; minScore: number }> = {
  unverified: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', icon: '❓', label: 'Unverified', minScore: 0 },
  bronze: { color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)', icon: '🥉', label: 'Bronze', minScore: 20 },
  silver: { color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.15)', icon: '🥈', label: 'Silver', minScore: 50 },
  gold: { color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)', icon: '🥇', label: 'Gold', minScore: 75 },
  platinum: { color: '#e5e4e2', bg: 'linear-gradient(135deg, rgba(229, 228, 226, 0.2), rgba(180, 180, 180, 0.1))', icon: '💎', label: 'Platinum', minScore: 95 },
};

export function TrustBadge({ tier, size = 'md' }: { tier: TrustTier; size?: 'sm' | 'md' | 'lg' }) {
  const config = TIER_CONFIG[tier];
  const sizes = {
    sm: { padding: '4px 8px', fontSize: 11, iconSize: 12 },
    md: { padding: '6px 12px', fontSize: 12, iconSize: 14 },
    lg: { padding: '8px 16px', fontSize: 14, iconSize: 18 },
  };
  const s = sizes[size];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: s.padding,
      borderRadius: 20,
      background: config.bg,
      border: `1px solid ${config.color}40`,
      fontSize: s.fontSize,
      fontWeight: 600,
      color: config.color,
    }}>
      <span style={{ fontSize: s.iconSize }}>{config.icon}</span>
      {config.label}
    </div>
  );
}

export function CreditScore({ score, size = 80 }: { score: number; size?: number }) {
  const tier = getTierFromScore(score);
  const config = TIER_CONFIG[tier];
  const circumference = 2 * Math.PI * 35;
  const progress = (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40" cy="40" r="35"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="40" cy="40" r="35"
          fill="none"
          stroke={config.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: size * 0.3, fontWeight: 800, color: config.color }}>{score}</div>
        <div style={{ fontSize: size * 0.12, color: '#888', textTransform: 'uppercase' }}>Score</div>
      </div>
    </div>
  );
}

export function AgentCard({ agent, isDark = true, onClick }: { agent: AgentProfile; isDark?: boolean; onClick?: () => void }) {
  const tierConfig = TIER_CONFIG[agent.tier];
  const successRate = agent.stats.totalEscrows > 0 
    ? Math.round((agent.stats.successfulReleases / agent.stats.totalEscrows) * 100) 
    : 0;

  return (
    <div 
      onClick={onClick}
      style={{
        padding: 20,
        borderRadius: 16,
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Credit Score */}
        <CreditScore score={agent.score} size={70} />

        {/* Agent Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ 
              fontFamily: 'ui-monospace', 
              fontSize: 14, 
              fontWeight: 600,
              color: isDark ? '#e0e0e0' : '#111'
            }}>
              {agent.name || `${agent.address.slice(0, 6)}...${agent.address.slice(-4)}`}
            </span>
            <TrustBadge tier={agent.tier} size="sm" />
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StatItem label="Success Rate" value={`${successRate}%`} isDark={isDark} />
            <StatItem label="Escrows" value={agent.stats.totalEscrows.toString()} isDark={isDark} />
            <StatItem label="Volume" value={formatVolume(agent.stats.totalVolume)} isDark={isDark} />
          </div>

          {/* Badges */}
          {agent.badges.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {agent.badges.map((badge, i) => (
                <span key={i} style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: isDark ? 'rgba(102, 126, 234, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                  color: isDark ? '#667eea' : '#6366f1',
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatVolume(volume: string): string {
  const num = parseFloat(volume);
  if (isNaN(num)) return volume;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M MNEE`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K MNEE`;
  return `${num.toFixed(0)} MNEE`;
}

function StatItem({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: isDark ? '#666' : '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#e0e0e0' : '#111' }}>
        {value}
      </div>
    </div>
  );
}

export function getTierFromScore(score: number): TrustTier {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'silver';
  if (score >= 40) return 'bronze';
  return 'unverified';
}

// Full Agent Reputation Component with Backend Integration
export function AgentReputation({ isDark = true }: { isDark?: boolean }) {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [tierCounts, setTierCounts] = useState({ platinum: 0, gold: 0, silver: 0, bronze: 0, unverified: 0 });
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentAddress, setNewAgentAddress] = useState('');
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);

  // Fetch agents from backend (REAL DATA ONLY)
  const fetchAgents = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/agents`);
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      if (data.success) {
        const mappedAgents: AgentProfile[] = data.agents.map((a: any) => ({
          address: a.address,
          name: a.name,
          tier: a.tier?.toLowerCase() || getTierFromScore(a.score),
          score: a.score,
          stats: {
            totalEscrows: a.stats?.totalEscrows || 0,
            successfulReleases: a.stats?.successfulReleases || 0,
            disputesWon: a.stats?.disputesWon || 0,
            disputesLost: a.stats?.disputesLost || 0,
            totalVolume: a.stats?.totalVolume || '0',
            avgResponseTime: a.stats?.avgResponseTime,
          },
          badges: a.badges || [],
          registeredAt: a.registeredAt,
          lastActive: a.lastActive,
        }));
        
        setAgents(mappedAgents);
        setTierCounts(data.tiers || { platinum: 0, gold: 0, silver: 0, bronze: 0, unverified: 0 });
        setIsLive(true);
      }
    } catch (err) {
      console.log('Backend unavailable');
      setAgents([]);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  // Register new agent
  const registerAgent = async () => {
    if (!newAgentAddress) {
      setRegisterStatus('Address required');
      return;
    }
    
    setRegisterStatus('Registering...');
    
    try {
      const res = await fetch(`${BACKEND_URL}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: newAgentAddress,
          name: newAgentName || undefined,
          type: 'ai'
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setRegisterStatus('✅ Agent registered!');
        setNewAgentName('');
        setNewAgentAddress('');
        fetchAgents(); // Refresh list
      } else {
        setRegisterStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setRegisterStatus('Failed to register (backend offline)');
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{
        borderRadius: 20,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🏆</div>
        <div style={{ color: isDark ? '#888' : '#64748b' }}>Loading agents...</div>
      </div>
    );
  }

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
          ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(205, 127, 50, 0.08))'
          : 'linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(205, 127, 50, 0.05))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🏆 Agent Reputation & Leaderboard</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#888' : '#64748b' }}>
              {isLive ? 'Live from backend registry' : 'Connecting to backend...'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isLive && (
              <div style={{
                padding: '4px 8px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                fontSize: 10,
                fontWeight: 600,
              }}>
                LIVE
              </div>
            )}
            <div style={{
              padding: '6px 12px',
              borderRadius: 20,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
              fontSize: 11,
              fontWeight: 600,
              color: isDark ? '#888' : '#64748b',
            }}>
              {agents.length} Agents
            </div>
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, color: isDark ? '#888' : '#64748b' }}>
          TIER DISTRIBUTION
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {(['platinum', 'gold', 'silver', 'bronze', 'unverified'] as TrustTier[]).map(tier => (
            <div key={tier} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{TIER_CONFIG[tier].icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TIER_CONFIG[tier].color }}>
                {isLive ? tierCounts[tier] : agents.filter(a => a.tier === tier).length}
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#666' : '#94a3b8' }}>{TIER_CONFIG[tier].label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent List */}
      <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto' }}>
        {agents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: isDark ? '#666' : '#94a3b8',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No Agents Registered Yet</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <strong>To register an agent:</strong><br/>
              1. Enter an Ethereum address (0x...) below<br/>
              2. Optionally add a name for identification<br/>
              3. Click "Register" to add to the leaderboard<br/>
              <span style={{ fontSize: 11, color: isDark ? '#555' : '#94a3b8' }}>
                Trust scores update automatically based on escrow performance.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agents.map((agent, i) => (
              <AgentCard key={agent.address || i} agent={agent} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      {/* Register New Agent */}
      <div style={{
        padding: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, color: isDark ? '#888' : '#64748b' }}>
          ➕ REGISTER NEW AGENT
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newAgentAddress}
            onChange={(e) => setNewAgentAddress(e.target.value)}
            placeholder="0x... (address)"
            style={{
              flex: 2,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              color: isDark ? '#e0e0e0' : '#111',
              fontSize: 12,
            }}
          />
          <input
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="Name (optional)"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              color: isDark ? '#e0e0e0' : '#111',
              fontSize: 12,
            }}
          />
          <button
            onClick={registerAgent}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>
        {registerStatus && (
          <div style={{ marginTop: 8, fontSize: 11, color: registerStatus.startsWith('✅') ? '#22c55e' : '#f59e0b' }}>
            {registerStatus}
          </div>
        )}
      </div>
    </div>
  );
}

// Sample agents for demo (used as fallback)
export const SAMPLE_AGENTS: AgentProfile[] = [
  {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8aB12',
    name: 'CodeBot Pro',
    tier: 'gold',
    score: 87,
    stats: {
      totalEscrows: 156,
      successfulReleases: 149,
      disputesWon: 5,
      disputesLost: 2,
      avgResponseTime: '< 5 min',
      totalVolume: '45230',
    },
    badges: ['Fast Responder', 'High Volume', 'Verified Dev'],
    joinedDate: '2024-03-15',
  },
  {
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    name: 'DataCrunch AI',
    tier: 'silver',
    score: 62,
    stats: {
      totalEscrows: 43,
      successfulReleases: 38,
      disputesWon: 3,
      disputesLost: 2,
      avgResponseTime: '< 1 hour',
      totalVolume: '8750',
    },
    badges: ['Data Specialist'],
    joinedDate: '2024-08-20',
  },
  {
    address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
    name: 'Creative Canvas',
    tier: 'platinum',
    score: 98,
    stats: {
      totalEscrows: 892,
      successfulReleases: 889,
      disputesWon: 3,
      disputesLost: 0,
      avgResponseTime: '< 2 min',
      totalVolume: '234500',
    },
    badges: ['Top Performer', 'Zero Disputes', 'Premium Partner', 'Fast Responder'],
    joinedDate: '2023-01-10',
  },
];
