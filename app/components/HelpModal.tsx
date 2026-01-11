'use client';

import React, { useState, useEffect } from 'react';

interface HelpModalProps {
  isDark: boolean;
}

export function HelpButton({ isDark }: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // Keyboard shortcut: Press '?' to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sections = [
    {
      title: "Getting Started",
      icon: "🚀",
      content: [
        "1. Connect your wallet (MetaMask)",
        "2. Ensure you have MNEE tokens (100,000 on Hardhat Local)",
        "3. Navigate using tabs: Demo, Escrow, AI Agents, MeshMind, Advanced",
        "4. Use the language toggle (EN/ES) to switch languages"
      ]
    },
    {
      title: "Complete Escrow Flow",
      icon: "🔒",
      content: [
        "📋 FULL WORKFLOW:",
        "1. Escrow Tab → Enter Payee, Arbiter, Amount",
        "2. Click 'Approve MNEE' → Confirm in MetaMask",
        "3. Click 'Create Escrow' → Confirm in MetaMask",
        "4. Escrow ID appears in Ops Log (click to load)",
        "5. Release Funds → Sends to Payee",
        "6. Balance Tracker shows before/after amounts"
      ]
    },
    {
      title: "Negotiation → Escrow Flow",
      icon: "🤝",
      content: [
        "📋 INTEGRATED WORKFLOW:",
        "1. Advanced Tab → Negotiation Sandbox",
        "2. Start negotiation with task & offer",
        "3. AI agents negotiate until agreement",
        "4. Click 'Create Escrow with Agreed Terms'",
        "5. Go to Escrow Tab → Create escrow",
        "6. Release funds → Negotiation shows '✅ COMPLETED'",
        "",
        "The negotiation tracks the full escrow lifecycle!"
      ]
    },
    {
      title: "Streaming Payments",
      icon: "💸",
      content: [
        "📋 MONEY FLOW:",
        "1. 💰 Wallet (100) → 🔒 Locked (100) — Wallet shows 0",
        "2. 🔒 Locked slowly moves to → 📤 Streamed",
        "3. Receiver clicks Withdraw → 🤖 Receiver balance increases",
        "4. Stop Stream → 🔒 Remaining returns to 💰 Wallet",
        "",
        "Use 'Reset Demo' to start fresh with 100 MNEE"
      ]
    },
    {
      title: "AI Agent Decisions",
      icon: "🤖",
      content: [
        "Multi-agent AI system analyzes every escrow:",
        "• Compliance Agent - Regulatory risk assessment",
        "• Operations Agent - Delivery verification",
        "• Arbiter Agent - Final recommendation (RELEASE/REFUND)",
        "",
        "AI Agents Tab → Enter Escrow ID → Get Recommendation"
      ]
    },
    {
      title: "AI Arbitration",
      icon: "⚖️",
      content: [
        "Two-tier dispute resolution:",
        "1. Enter disputed Escrow ID",
        "2. Submit evidence from both parties",
        "3. Click 'Load Dispute' to analyze",
        "4. AI provides verdict with confidence score",
        "5. Appeals go to DAO voting (multi-sig)"
      ]
    },
    {
      title: "Chained Escrows",
      icon: "🔗",
      content: [
        "Multi-hop payments with dependencies:",
        "1. Create parent escrow (main contractor)",
        "2. Create child escrows (subcontractors)",
        "3. Link them: Parent ID → Child ID → Click Link",
        "4. Child funds release ONLY when parent completes",
        "",
        "Example: Client → Lead Dev → Frontend/Backend"
      ]
    },
    {
      title: "MeshMind Assistant",
      icon: "🧠",
      content: [
        "Your intelligent knowledge companion (Groq AI):",
        "• Ask about escrow operations",
        "• Query policies and rules",
        "• Get platform guidance",
        "• Troubleshoot issues",
        "",
        "Example: 'How do I release funds from an escrow?'"
      ]
    },
    {
      title: "Keyboard Shortcuts",
      icon: "⌨️",
      content: [
        "Press '?' - Open this help menu",
        "Press 'D' - Go to Demo tab",
        "Press 'E' - Go to Escrow tab",
        "Press 'A' - Go to AI Agents tab",
        "Press 'M' - Go to MeshMind tab",
        "Press 'X' - Go to Advanced tab"
      ]
    }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Help & Guide"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: isDark 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        ?
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={() => setIsOpen(false)}>
      <div 
        style={{
          width: '90%',
          maxWidth: 700,
          maxHeight: '80vh',
          background: isDark ? '#1a1a2e' : '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
              📚 Help & Guide
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#888' : '#666' }}>
              Learn how to use AutoTrust Paymesh
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
              color: isDark ? '#888' : '#666',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', height: 400 }}>
          {/* Sidebar */}
          <div style={{
            width: 200,
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
            padding: 12,
            overflowY: 'auto',
          }}>
            {sections.map((section, i) => (
              <button
                key={i}
                onClick={() => setActiveSection(i)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: activeSection === i 
                    ? (isDark ? 'rgba(102, 126, 234, 0.2)' : 'rgba(99, 102, 241, 0.1)')
                    : 'transparent',
                  color: activeSection === i 
                    ? (isDark ? '#667eea' : '#6366f1')
                    : (isDark ? '#a0a0b0' : '#666'),
                  fontSize: 13,
                  fontWeight: activeSection === i ? 600 : 400,
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{section.icon}</span>
                {section.title}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <h3 style={{ 
              margin: '0 0 16px', 
              fontSize: 18, 
              fontWeight: 700,
              color: isDark ? '#fff' : '#111',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>{sections[activeSection].icon}</span>
              {sections[activeSection].title}
            </h3>
            <div style={{ 
              fontSize: 14, 
              lineHeight: 2, 
              color: isDark ? '#c0c0c0' : '#444' 
            }}>
              {sections[activeSection].content.map((line, i) => (
                <div key={i} style={{ marginBottom: 8 }}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 16,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: isDark ? '#666' : '#999' }}>
            Press <kbd style={{ 
              padding: '2px 6px', 
              borderRadius: 4, 
              background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
              fontFamily: 'ui-monospace',
            }}>?</kbd> anytime to open help
          </span>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: isDark 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
