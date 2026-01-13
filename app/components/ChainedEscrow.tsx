'use client';

import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../lib/config';
import { TrustBadge, getTierFromScore } from './AgentReputation';



interface EscrowNode {
  id: string;
  agent: { name: string; avatar: string; score: number };
  task: string;
  amount: number;
  status: 'pending' | 'funded' | 'working' | 'completed' | 'released';
  dependsOn?: string;
}

const STATUS_CONFIG = {
  pending: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Pending', icon: '⏳' },
  funded: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Funded', icon: '💰' },
  working: { color: '#667eea', bg: 'rgba(102, 126, 234, 0.15)', label: 'In Progress', icon: '⚙️' },
  completed: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Completed', icon: '✅' },
  released: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Released', icon: '🎉' },
};

export function ChainedEscrow({ isDark = true }: { isDark?: boolean }) {
  const [chain, setChain] = useState<EscrowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newParentId, setNewParentId] = useState('');
  const [newChildId, setNewChildId] = useState('');

  // Fetch chains from backend
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/escrows/chains`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.chains.length > 0) {
            // Convert chains to EscrowNode format
            const nodes: EscrowNode[] = [];
            for (const root of data.chains) {
              nodes.push({
                id: root.id.slice(0, 10) + '...',
                agent: { name: 'Root Escrow', avatar: '📦', score: 80 },
                task: 'Parent Escrow',
                amount: 0, // Would need to fetch from escrow contract
                status: 'funded',
              });
              for (const childId of root.children || []) {
                nodes.push({
                  id: childId.slice(0, 10) + '...',
                  agent: { name: 'Child Escrow', avatar: '🔗', score: 70 },
                  task: 'Dependent Escrow',
                  amount: 0,
                  status: 'pending',
                  dependsOn: root.id.slice(0, 10) + '...',
                });
              }
            }
            setChain(nodes);
            setIsLive(true);
          }
        }
      } catch (err) {
        console.log('Could not fetch chains');
      } finally {
        setLoading(false);
      }
    };
    fetchChains();
  }, []);

  // Link escrows on backend
  const linkEscrowsOnBackend = async (parentId: string, childId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/escrows/chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, childId, dependencyType: 'release' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsLive(true);
          setLinkStatus(`✅ Linked ${childId} to ${parentId}`);
          return true;
        }
      }
    } catch (err) {
      console.log('Backend unavailable');
    }
    return false;
  };

  // Link real escrows on backend
  const linkRealEscrows = async () => {
    if (!newParentId || !newChildId) {
      setLinkStatus('⚠️ Enter both parent and child escrow IDs');
      return;
    }

    setLinkStatus('Linking escrows...');
    const linked = await linkEscrowsOnBackend(newParentId, newChildId);

    if (linked) {
      // Add to local chain display
      const newNode: EscrowNode = {
        id: newChildId.slice(0, 10) + '...',
        agent: { name: 'Linked Escrow', avatar: '🔗', score: 70 },
        task: 'Dependent on ' + newParentId.slice(0, 10),
        amount: 0,
        status: 'pending',
        dependsOn: newParentId.slice(0, 10) + '...',
      };

      // Check if parent exists in chain
      const parentExists = chain.some(n => n.id.startsWith(newParentId.slice(0, 10)));
      if (!parentExists) {
        setChain(prev => [...prev, {
          id: newParentId.slice(0, 10) + '...',
          agent: { name: 'Parent Escrow', avatar: '📦', score: 80 },
          task: 'Root Escrow',
          amount: 0,
          status: 'funded',
        }, newNode]);
      } else {
        setChain(prev => [...prev, newNode]);
      }

      setNewParentId('');
      setNewChildId('');
      setIsLive(true);
    }
  };

  const totalValue = chain.reduce((sum, node) => sum + node.amount, 0);
  const completedValue = chain
    .filter(n => n.status === 'completed' || n.status === 'released')
    .reduce((sum, node) => sum + node.amount, 0);

  const resetChain = () => {
    setChain([]);
    setIsLive(false);
    setLinkStatus(null);
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
        background: isDark ? 'rgba(118, 75, 162, 0.08)' : 'rgba(139, 92, 246, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔗 Chained Escrow (Multi-Hop)</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#888' : '#64748b' }}>
              {isLive ? 'Live chains from backend' : 'Link real escrows to create dependencies'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {isLive && (
              <div style={{
                padding: '4px 8px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                fontSize: 10,
                fontWeight: 600,
                marginBottom: 4,
              }}>
                LIVE
              </div>
            )}
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{totalValue} MNEE</div>
            <div style={{ fontSize: 11, color: isDark ? '#666' : '#94a3b8' }}>
              {completedValue} released ({Math.round(completedValue / totalValue * 100)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Chain Visualization */}
      <div style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: isDark ? '#666' : '#94a3b8' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
            <div>Loading chains from backend...</div>
          </div>
        ) : chain.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: isDark ? '#666' : '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No Chained Escrows Yet</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <strong>To create a chain:</strong><br />
              1. First create escrows via the "Escrow" tab<br />
              2. Copy escrow IDs from the operations log<br />
              3. Link them below (parent → child dependency)<br />
              <span style={{ fontSize: 11, color: isDark ? '#555' : '#94a3b8' }}>
                Child funds release only when parent completes.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {chain.map((node, index) => (
              <div key={node.id}>
                {/* Connector Line */}
                {index > 0 && node.dependsOn && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: 30,
                    height: 30,
                  }}>
                    <div style={{
                      width: 2,
                      height: '100%',
                      background: chain[index - 1]?.status === 'completed' || chain[index - 1]?.status === 'released'
                        ? 'linear-gradient(180deg, #22c55e, #667eea)'
                        : isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                    }} />
                    <div style={{
                      fontSize: 10,
                      color: isDark ? '#555' : '#94a3b8',
                      marginLeft: 8,
                      fontStyle: 'italic',
                    }}>
                      depends on {node.dependsOn}
                    </div>
                  </div>
                )}

                {/* Node */}
                <EscrowNodeCard
                  node={node}
                  isDark={isDark}
                  isSelected={selectedNode === node.id}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                  indentLevel={node.dependsOn ? 1 : 0}
                />
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 12,
          background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>{config.icon}</span>
              <span style={{ fontSize: 11, color: config.color }}>{config.label}</span>
            </div>
          ))}
        </div>

        {linkStatus && (
          <div style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 11,
            color: linkStatus.startsWith('✅') ? '#22c55e' : '#f59e0b'
          }}>
            {linkStatus}
          </div>
        )}
      </div>

      {/* Flow Description */}
      <div style={{
        padding: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
        background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: isDark ? '#888' : '#64748b' }}>
          ⚡ HOW IT WORKS
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: isDark ? '#a0a0b0' : '#4b5563' }}>
          1. Client locks 500 MNEE for full project → 2. LeadDevAI receives partial, subcontracts →
          3. FrontendBot & DataCrunch work in parallel → 4. Completion triggers cascading releases
        </div>
      </div>

      {/* Link New Escrows */}
      <div style={{
        padding: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
        background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, color: isDark ? '#888' : '#64748b' }}>
          🔗 LINK ESCROWS (Create Dependency)
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            placeholder="Parent Escrow ID (0x...)"
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
          <input
            value={newChildId}
            onChange={(e) => setNewChildId(e.target.value)}
            placeholder="Child Escrow ID (0x...)"
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
            onClick={linkRealEscrows}
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
            Link
          </button>
        </div>
        <div style={{ fontSize: 10, color: isDark ? '#555' : '#94a3b8' }}>
          Child escrow will only release funds when parent escrow is released.
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 16, display: 'flex', gap: 12 }}>
        {chain.length > 0 && (
          <button
            onClick={resetChain}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
              background: 'transparent',
              color: isDark ? '#a0a0b0' : '#64748b',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 Clear View
          </button>
        )}
      </div>
    </div>
  );
}

function EscrowNodeCard({
  node,
  isDark,
  isSelected,
  onClick,
  indentLevel = 0,
}: {
  node: EscrowNode;
  isDark: boolean;
  isSelected: boolean;
  onClick: () => void;
  indentLevel?: number;
}) {
  const config = STATUS_CONFIG[node.status];

  return (
    <div
      onClick={onClick}
      style={{
        marginLeft: indentLevel * 40,
        padding: 16,
        borderRadius: 16,
        background: isSelected
          ? (isDark ? 'rgba(102, 126, 234, 0.15)' : 'rgba(99, 102, 241, 0.1)')
          : (isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb'),
        border: `2px solid ${isSelected ? '#667eea' : (isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb')}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: Agent info */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: config.bg,
            border: `2px solid ${config.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            {node.agent.avatar}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{node.agent.name}</span>
              <TrustBadge tier={getTierFromScore(node.agent.score)} size="sm" />
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#888' : '#64748b', marginTop: 2 }}>
              {node.task}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'ui-monospace', color: isDark ? '#555' : '#94a3b8', marginTop: 4 }}>
              Escrow ID: {node.id}
            </div>
          </div>
        </div>

        {/* Right: Amount & Status */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>
            {node.amount} MNEE
          </div>
          <div style={{
            marginTop: 4,
            padding: '4px 10px',
            borderRadius: 8,
            background: config.bg,
            color: config.color,
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            {config.icon} {config.label}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isSelected && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          fontSize: 11,
        }}>
          <div>
            <div style={{ color: isDark ? '#666' : '#94a3b8' }}>Trust Score</div>
            <div style={{ fontWeight: 700 }}>{node.agent.score}/100</div>
          </div>
          <div>
            <div style={{ color: isDark ? '#666' : '#94a3b8' }}>Dependency</div>
            <div style={{ fontWeight: 700 }}>{node.dependsOn || 'None (Root)'}</div>
          </div>
          <div>
            <div style={{ color: isDark ? '#666' : '#94a3b8' }}>Release Condition</div>
            <div style={{ fontWeight: 700 }}>On parent completion</div>
          </div>
        </div>
      )}
    </div>
  );
}
