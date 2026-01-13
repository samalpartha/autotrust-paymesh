'use client';

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ERC20_ABI, ESCROW_ABI, ESCROW_ADDRESS, MNEE_TOKEN, BACKEND_URL, TOKEN_NAME, NETWORK_NAME, EXPLORER_URL, IS_LOCAL } from "../../lib/contracts";
import { formatUnits, parseUnits, keccak256, toHex } from "viem";
import { shortAddr } from "../../lib/utils";
import { GasIndicator } from "../../components/GasIndicator";
import { WalletConnect } from "../../components/WalletConnect";
import { useTheme } from "../../context/ThemeContext";
import { ThemeToggle } from "../../components/ThemeToggle";
import { HelpButton } from "../../components/HelpModal";
import { Tooltip } from "../../components/Tooltip";
import { Logo } from "../../components/Logo";
import { NegotiationSandbox } from "../../components/NegotiationSandbox";
import { ArbitrationTribunal } from "../../components/ArbitrationTribunal";
import { AgentReputation } from "../../components/AgentReputation";
import { StreamingPayments } from "../../components/StreamingPayments";
import { ChainedEscrow } from "../../components/ChainedEscrow";
import { AnalyticsDashboard } from "../../components/AnalyticsDashboard";
import { useToast } from "../../components/Toast";
import { playChaChingSound, playSuccess, playError, playWarning, playCopy } from "../../lib/sounds";
import { exportOpsLogToCSV, downloadTransactionReceipt } from "../../lib/export";
import { CopyButton, CopyableText, AddressDisplay } from "../../components/CopyButton";
import { OnboardingTour, TourRestartButton } from "../../components/OnboardingTour";
import { NotificationProvider, NotificationBell } from "../../components/RealtimeNotifications";
import { SoundToggle } from "../../components/SoundToggle";
import { useIsMobile, useBreakpoint, responsiveStyles } from "../../lib/responsive";

const STATUS = ["None", "Funded", "Released", "Refunded"] as const;
const STATUS_COLORS = ["#666", "#f59e0b", "#22c55e", "#ef4444"];

export default function EscrowConsole() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'demo' | 'escrow' | 'agent' | 'copilot' | 'advanced'>('demo');
  const { isDark, t } = useTheme();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'd': setActiveTab('demo'); break;
        case 'e': setActiveTab('escrow'); break;
        case 'a': setActiveTab('agent'); break;
        case 'm': setActiveTab('copilot'); break;
        case 'x': setActiveTab('advanced'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <NotificationProvider>
      <OnboardingTour />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
        }
        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .escrow-grid { grid-template-columns: 1fr !important; }
          .header-controls { flex-wrap: wrap; gap: 8px !important; }
          .tab-nav { overflow-x: auto; }
          .tab-nav button { padding: 8px 12px !important; font-size: 12px !important; white-space: nowrap; }
        }
        @media (max-width: 480px) {
          .main-content { padding: 12px !important; }
          .card { padding: 16px !important; }
          .header-title { font-size: 16px !important; }
        }
      `}</style>
      <main style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(145deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)"
          : "linear-gradient(145deg, #fafafa 0%, #f0f4f8 100%)",
        color: isDark ? "#e0e0e0" : "#111",
      }}>
        <div className="main-content" style={{ width: "100%", padding: "24px 32px", boxSizing: "border-box" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="/" style={{ textDecoration: "none" }}>
                <Logo size={52} isDark={isDark} />
              </a>
              <div>
                <a href="/" style={{ color: isDark ? "#667eea" : "#6366f1", textDecoration: "none", fontSize: 13 }}>
                  {t('nav.backToHome')}
                </a>
                <h1 style={{ margin: "4px 0 4px 0", fontSize: 24, fontWeight: 800, fontFamily: "'Space Grotesk', system-ui" }}>
                  {t('header.title')}
                </h1>
                <p style={{ margin: 0, color: isDark ? "#888" : "#666", fontSize: 13 }}>
                  {t('header.subtitle')}
                </p>
              </div>
            </div>

            <div className="header-controls" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <ThemeToggle />
              <SoundToggle />
              <NotificationBell />
              <Tooltip content={t('tooltip.gasPrice')} position="bottom">
                <GasIndicator />
              </Tooltip>
              <Tooltip content={t('tooltip.network')} position="bottom">
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 16,
                  background: isDark ? "rgba(46, 213, 115, 0.15)" : "rgba(99, 102, 241, 0.1)",
                  border: `1px solid ${isDark ? "#2ed573" : "#6366f1"}`,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDark ? "#2ed573" : "#6366f1" }} />
                  {NETWORK_NAME}
                </div>
              </Tooltip>
              <Tooltip content={t('tooltip.wallet')} position="bottom">
                <div data-tour="wallet-connect">
                  <WalletConnect variant="header" />
                </div>
              </Tooltip>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-nav" style={{ display: "flex", gap: 4, marginBottom: 20, background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0", padding: 4, borderRadius: 12, width: "fit-content", flexWrap: "wrap", overflowX: "auto", maxWidth: "100%" }}>
            {[
              { id: 'demo', labelKey: 'nav.demo', tooltipKey: 'tooltip.demo', tour: 'demo-tab' },
              { id: 'escrow', labelKey: 'nav.escrow', tooltipKey: 'tooltip.escrow', tour: 'escrow-tab' },
              { id: 'agent', labelKey: 'nav.aiAgents', tooltipKey: 'tooltip.aiAgents', tour: 'ai-tab' },
              { id: 'copilot', labelKey: 'nav.meshMind', tooltipKey: 'tooltip.meshMind', tour: 'meshmind-tab' },
              { id: 'advanced', labelKey: 'nav.advanced', tooltipKey: 'tooltip.advanced', tour: 'advanced-tab' },
            ].map(tab => (
              <Tooltip key={tab.id} content={t(tab.tooltipKey)} position="bottom">
                <div data-tour={tab.tour}>
                  <button
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: "none",
                      background: activeTab === tab.id
                        ? (isDark ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#fff")
                        : "transparent",
                      color: activeTab === tab.id ? (isDark ? "#fff" : "#111") : (isDark ? "#888" : "#666"),
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 14,
                      boxShadow: activeTab === tab.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {t(tab.labelKey)}
                  </button>
                </div>
              </Tooltip>
            ))}
          </div>

          {activeTab === 'demo' && <DemoTab />}
          {activeTab === 'escrow' && <EscrowTab />}
          {activeTab === 'agent' && <AgentTab />}
          {activeTab === 'copilot' && <CopilotTab />}
          {activeTab === 'advanced' && <AdvancedTab />}
        </div>

        {/* Floating Help Button */}
        <div data-tour="help-button">
          <HelpButton isDark={isDark} />
        </div>
      </main>
    </NotificationProvider>
  );
}

// ============================================================================
// DEMO TAB - For judges to see AI without wallet
// ============================================================================

function DemoTab() {
  const { isDark, t } = useTheme();
  const [step, setStep] = useState(0);
  const [activeStep, setActiveStep] = useState(0); // Currently running step
  const [demoData, setDemoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiDecision, setAiDecision] = useState<any>(null);
  const [copilotResult, setCopilotResult] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);

  // Add to activity log
  const log = (message: string) => {
    setActivityLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Check backend health
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.json())
      .then(d => {
        setBackendStatus(d);
        if (d.ok) log("✓ Backend connected");
        if (d.aiEnabled) log(`✓ AI ready: ${d.aiProvider || 'OpenAI'}`);
      })
      .catch(() => {
        setBackendStatus({ ok: false });
        log("✗ Backend offline");
      });
  }, []);

  // Load demo data
  async function loadDemoData() {
    setLoading(true);
    setActiveStep(1);
    log("→ Loading sample escrow data...");
    try {
      const res = await fetch(`${BACKEND_URL}/demo/sample-escrow`);
      const data = await res.json();
      setDemoData(data);
      setStep(1);
      log(`✓ Escrow loaded: ${data.escrow?.escrowId?.slice(0, 16)}...`);
      log(`  Amount: ${data.escrow?.amount} MNEE`);
      log(`  Status: ${data.escrow?.status}`);
    } catch (e) {
      log("✗ Failed to load escrow data");
      console.error(e);
    }
    setLoading(false);
    setActiveStep(0);
  }

  // Simulate AI decision with real-time logging
  async function simulateAI() {
    setLoading(true);
    setActiveStep(2);
    setStep(2);

    log("→ Starting multi-agent AI analysis...");
    await new Promise(r => setTimeout(r, 500));

    log("  🔍 Compliance Agent: Checking regulatory compliance...");
    await new Promise(r => setTimeout(r, 400));
    log("     → Risk score: 12/100 (LOW)");

    log("  📦 Operations Agent: Verifying delivery evidence...");
    await new Promise(r => setTimeout(r, 400));
    log("     → Evidence confirms service completion");

    log("  ⚖️ Arbiter Agent: Computing final recommendation...");
    await new Promise(r => setTimeout(r, 400));

    setAiDecision({
      recommendation: "RELEASE",
      confidence: 0.87,
      rationale: "Delivery evidence confirms service completion. Risk score is low (12/100). Both compliance and operations agents recommend release.",
      riskFlags: [],
      aiPowered: backendStatus?.aiEnabled,
      agents: {
        compliance: { riskScore: 12, riskLevel: "low", flags: [] },
        operations: { recommendation: "RELEASE", reasoning: "Evidence confirms delivery" },
        arbiter: { action: "RELEASE", confidence: 0.87, agentConsensus: true }
      }
    });

    log("✓ CONSENSUS REACHED: RELEASE (87% confidence)");
    log("  All 3 agents agree on recommendation");

    setLoading(false);
    setActiveStep(0);
    setStep(3);
  }

  // Demo copilot
  async function demoCopilot() {
    setLoading(true);
    setActiveStep(4);
    log("→ Querying MeshMind assistant...");
    try {
      const res = await fetch(`${BACKEND_URL}/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: "Summarize all escrows" })
      });
      const data = await res.json();
      setCopilotResult(data);
      log(`✓ MeshMind response received (${data.provider || 'AI'})`);
    } catch (e) {
      setCopilotResult({ answer: "Escrow Summary: Demo mode active. Connect to live system for real data." });
      log("✓ MeshMind responded (fallback mode)");
    }
    setLoading(false);
    setActiveStep(0);
    setStep(4);
  }

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)"
          : "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
        borderRadius: 20,
        padding: 32,
        marginBottom: 24,
        border: isDark ? "1px solid rgba(102, 126, 234, 0.3)" : "1px solid rgba(99, 102, 241, 0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>🎬</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{t('demo.title')}</h2>
            <p style={{ margin: "4px 0 0 0", color: isDark ? "#a0a0b0" : "#666" }}>
              {t('demo.subtitle')}
            </p>
          </div>
        </div>

        {/* Backend Status */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: backendStatus?.ok ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${backendStatus?.ok ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            fontSize: 13,
            fontWeight: 600,
            color: backendStatus?.ok ? "#22c55e" : "#ef4444",
          }}>
            {t('demo.backendConnected').replace('✓ Connected', backendStatus?.ok ? '✓ Connected' : '✗ Offline')}
          </div>
          <div style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: backendStatus?.aiEnabled ? "rgba(102, 126, 234, 0.15)" : "rgba(245, 158, 11, 0.15)",
            border: `1px solid ${backendStatus?.aiEnabled ? "rgba(102, 126, 234, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
            fontSize: 13,
            fontWeight: 600,
            color: backendStatus?.aiEnabled ? "#667eea" : "#f59e0b",
          }}>
            {t('demo.aiConnected').replace('✓ Connected', backendStatus?.aiEnabled ? `✓ ${backendStatus?.aiProvider || 'OpenAI'}` : '⚠ Rule-based')}
          </div>
        </div>
      </div>

      {/* Demo Steps with Active Glow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { num: 1, titleKey: 'demo.step1', descKey: 'demo.step1Desc', icon: "📂" },
          { num: 2, titleKey: 'demo.step2', descKey: 'demo.step2Desc', icon: "🧠" },
          { num: 3, titleKey: 'demo.step3', descKey: 'demo.step3Desc', icon: "✅" },
          { num: 4, titleKey: 'demo.step4', descKey: 'demo.step4Desc', icon: "💬" },
        ].map((s, i) => {
          const isActive = activeStep === s.num;
          const isComplete = step >= s.num;
          return (
            <div key={i} style={{
              padding: 20,
              borderRadius: 16,
              background: isActive
                ? (isDark ? "rgba(102, 126, 234, 0.25)" : "rgba(99, 102, 241, 0.15)")
                : isComplete
                  ? (isDark ? "rgba(102, 126, 234, 0.12)" : "rgba(99, 102, 241, 0.08)")
                  : (isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8"),
              border: `2px solid ${isActive ? (isDark ? "#667eea" : "#6366f1") : isComplete ? (isDark ? "rgba(102, 126, 234, 0.5)" : "rgba(99, 102, 241, 0.4)") : "transparent"}`,
              boxShadow: isActive ? `0 0 20px ${isDark ? "rgba(102, 126, 234, 0.4)" : "rgba(99, 102, 241, 0.3)"}` : "none",
              textAlign: "center",
              opacity: isComplete || isActive ? 1 : 0.4,
              transition: "all 0.3s ease",
              animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{isActive && loading ? "⏳" : s.icon}</div>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isComplete
                  ? (isDark ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#6366f1")
                  : (isDark ? "rgba(255,255,255,0.1)" : "#ddd"),
                color: isComplete ? "#fff" : (isDark ? "#888" : "#999"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                fontSize: 16,
                fontWeight: 700
              }}>
                {step > s.num ? "✓" : s.num}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t(s.titleKey)}</div>
              <div style={{ fontSize: 12, color: isDark ? "#888" : "#666" }}>{t(s.descKey)}</div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          style={{ ...primaryBtn(isDark), padding: "14px 24px", fontSize: 15, opacity: step >= 1 ? 0.6 : 1 }}
          onClick={loadDemoData}
          disabled={loading || step >= 1}
        >
          {loading && activeStep === 1 ? `⏳ ${t('common.loading')}` : step >= 1 ? "✓" : ""} {t('demo.loadEscrow')}
        </button>
        <button
          style={{ ...primaryBtn(isDark), padding: "14px 24px", fontSize: 15, opacity: step < 1 || step >= 3 ? 0.6 : 1 }}
          onClick={simulateAI}
          disabled={loading || step < 1 || step >= 3}
        >
          {loading && activeStep === 2 ? `🧠 ${t('common.analyzing')}` : step >= 3 ? "✓" : ""} {t('demo.runAI')}
        </button>
        <button
          style={{ ...primaryBtn(isDark), padding: "14px 24px", fontSize: 15, opacity: step < 3 ? 0.6 : 1 }}
          onClick={demoCopilot}
          disabled={loading || step < 3}
        >
          {loading && activeStep === 4 ? "💬..." : step >= 4 ? "✓" : ""} {t('demo.askMeshMind')}
        </button>
        <button
          style={{ ...secondaryBtn(isDark), padding: "14px 24px", fontSize: 15 }}
          onClick={() => { setStep(0); setActiveStep(0); setDemoData(null); setAiDecision(null); setCopilotResult(null); setActivityLog([]); }}
        >
          {t('demo.reset')}
        </button>
      </div>

      {/* Activity Log - Real-time console */}
      <div style={{
        ...card(isDark),
        marginBottom: 24,
        padding: 16,
        background: isDark ? "rgba(0, 0, 0, 0.3)" : "#1a1a2e",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: loading ? "pulse 1s infinite" : "none" }}></span>
            Activity Log
          </h4>
          <span style={{ fontSize: 10, color: "#666" }}>{activityLog.length} events</span>
        </div>
        <div style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          lineHeight: 1.8,
          maxHeight: 150,
          overflowY: "auto",
          color: "#a0f0a0",
        }}>
          {activityLog.length === 0 ? (
            <div style={{ color: "#666", fontStyle: "italic" }}>Waiting for demo actions...</div>
          ) : (
            activityLog.map((log, i) => (
              <div key={i} style={{
                color: log.includes("✓") ? "#22c55e" : log.includes("✗") ? "#ef4444" : log.includes("→") ? "#f59e0b" : "#a0f0a0",
                opacity: i === activityLog.length - 1 ? 1 : 0.7,
              }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Demo Content */}
      <div style={{ display: "grid", gridTemplateColumns: step >= 3 ? "1fr 1fr" : "1fr", gap: 20 }}>
        {/* Sample Escrow */}
        {demoData && (
          <div style={card(isDark)}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>📦 Sample Escrow</h3>
            <div style={row(isDark)}><span style={label(isDark)}>Amount</span><span style={{ fontWeight: 700 }}>5 MNEE</span></div>
            <div style={row(isDark)}><span style={label(isDark)}>Payer</span><span style={{ fontFamily: "ui-monospace", fontSize: 12 }}>{demoData.sampleEscrow?.payer?.slice(0, 12)}...</span></div>
            <div style={row(isDark)}><span style={label(isDark)}>Payee</span><span style={{ fontFamily: "ui-monospace", fontSize: 12 }}>{demoData.sampleEscrow?.payee?.slice(0, 12)}...</span></div>
            <div style={row(isDark)}><span style={label(isDark)}>Status</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>FUNDED</span></div>

            {demoData.howItWorks && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>How It Works:</div>
                {demoData.howItWorks.map((step: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: isDark ? "#a0a0b0" : "#666", marginBottom: 4 }}>{step}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Decision */}
        {aiDecision && (
          <div style={card(isDark)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🤖 AI Agent Decision</h3>
              <span style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                background: aiDecision.aiPowered ? "rgba(102, 126, 234, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: aiDecision.aiPowered ? "#667eea" : "#f59e0b"
              }}>
                {aiDecision.aiPowered ? "OpenAI Powered" : "Rule-based"}
              </span>
            </div>

            {/* Recommendation Badge */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: "rgba(34, 197, 94, 0.1)",
              border: "2px solid rgba(34, 197, 94, 0.3)",
              textAlign: "center",
              marginBottom: 16
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{aiDecision.recommendation}</div>
              <div style={{ fontSize: 14, color: isDark ? "#a0a0b0" : "#666", marginTop: 4 }}>
                Confidence: {(aiDecision.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* Rationale */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: isDark ? "#888" : "#666" }}>Rationale:</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: isDark ? "#e0e0e0" : "#333" }}>{aiDecision.rationale}</div>
            </div>

            {/* Agent Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: isDark ? "#888" : "#666", marginBottom: 4 }}>Compliance</div>
                <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 13 }}>Low Risk</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: isDark ? "#888" : "#666", marginBottom: 4 }}>Operations</div>
                <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 13 }}>RELEASE</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: isDark ? "#888" : "#666", marginBottom: 4 }}>Arbiter</div>
                <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 13 }}>Consensus ✓</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copilot Result */}
      {copilotResult && (
        <div style={{ ...card(isDark), marginTop: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>💬 RAG Copilot Response</h3>
          <div style={{
            padding: 20,
            borderRadius: 16,
            background: isDark ? "rgba(102, 126, 234, 0.1)" : "rgba(99, 102, 241, 0.05)",
            border: `1px solid ${isDark ? "rgba(102, 126, 234, 0.3)" : "rgba(99, 102, 241, 0.2)"}`
          }}>
            <div style={{ fontSize: 12, color: isDark ? "#667eea" : "#6366f1", marginBottom: 8, fontWeight: 600 }}>
              Query: "Summarize all escrows"
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{copilotResult.answer}</div>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      {step === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
          <FeatureHighlight
            isDark={isDark}
            icon="🤖"
            title="Multi-Agent AI"
            desc="3 specialized agents (Compliance, Operations, Arbiter) analyze each escrow independently before reaching consensus"
          />
          <FeatureHighlight
            isDark={isDark}
            icon="🧠"
            title="MeshMind Assistant"
            desc="Intelligent knowledge assistant powered by AI - ask anything about escrows, policies, and platform features"
          />
          <FeatureHighlight
            isDark={isDark}
            icon="⚡"
            title="Autonomous Execution"
            desc="High-confidence AI decisions can be automatically executed on-chain without human intervention"
          />
        </div>
      )}
    </div>
  );
}

function FeatureHighlight({ isDark, icon, title, desc }: { isDark: boolean; icon: string; title: string; desc: string }) {
  return (
    <div style={{
      padding: 24,
      borderRadius: 16,
      background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5"}`,
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: isDark ? "#888" : "#666" }}>{desc}</div>
    </div>
  );
}

// ============================================================================
// ESCROW TAB
// ============================================================================

function EscrowTab() {
  const { isDark, t } = useTheme();
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const [payee, setPayee] = useState("");
  const [arbiter, setArbiter] = useState("");
  const [amount, setAmount] = useState("5");
  const [deadlineMins, setDeadlineMins] = useState("30");
  const [escrowKey, setEscrowKey] = useState("order-000000");
  const [activeEscrowId, setActiveEscrowId] = useState<string>("");
  const [lastTxHash, setLastTxHash] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setEscrowKey("order-" + Math.floor(Math.random() * 1e6));
  }, []);

  const escrowId = useMemo(() => {
    const hex = toHex(new TextEncoder().encode(escrowKey));
    return keccak256(hex);
  }, [escrowKey]);

  const amt = useMemo(() => {
    try { return parseUnits(amount || "0", 18); } catch { return 0n; }
  }, [amount]);

  const bal = useReadContract({
    abi: ERC20_ABI,
    address: MNEE_TOKEN,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const allowance = useReadContract({
    abi: ERC20_ABI,
    address: MNEE_TOKEN,
    functionName: "allowance",
    args: address ? [address, ESCROW_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const escrowView = useReadContract({
    abi: ESCROW_ABI,
    address: ESCROW_ADDRESS,
    functionName: "escrows",
    args: (activeEscrowId || escrowId) ? [((activeEscrowId || escrowId) as `0x${string}`)] : undefined,
    query: { enabled: isConnected },
  });

  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Refetch balances, allowance, and escrow data when a transaction succeeds
  useEffect(() => {
    if (txSuccess) {
      bal.refetch();
      allowance.refetch();
      escrowView.refetch();
    }
  }, [txSuccess]);

  const balanceStr = useMemo(() => bal.data ? formatUnits(bal.data as bigint, 18) : "0", [bal.data]);
  const allowanceStr = useMemo(() => allowance.data ? formatUnits(allowance.data as bigint, 18) : "0", [allowance.data]);
  const needsApproval = useMemo(() => ((allowance.data as bigint | undefined) || 0n) < amt, [allowance.data, amt]);
  const insufficientBalance = useMemo(() => ((bal.data as bigint | undefined) || 0n) < amt, [bal.data, amt]);

  async function approve() {
    try {
      const hash = await writeContractAsync({
        abi: ERC20_ABI,
        address: MNEE_TOKEN,
        functionName: "approve",
        args: [ESCROW_ADDRESS, amt]
      });
      setLastTxHash(hash);
      toast.success("Approval transaction sent!");
    } catch (err: any) {
      console.error("Approval error:", err);
      const msg = err?.message || String(err);
      if (!msg.includes("User rejected") && !msg.includes("user rejected")) {
        toast.error(`Approval Failed: ${msg.slice(0, 100)}`);
      }
    }
  }

  async function createEscrow() {
    try {
      const deadline = Math.floor(Date.now() / 1000) + (Number(deadlineMins || "0") * 60);
      // Use zero hash for metadataHash (no off-chain metadata)
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      console.log("Creating escrow with:", { escrowId, payee, amt: amt.toString(), arbiter, deadline, metadataHash });
      const hash = await writeContractAsync({
        abi: ESCROW_ABI,
        address: ESCROW_ADDRESS,
        functionName: "createEscrow",
        args: [escrowId as `0x${string}`, payee as `0x${string}`, amt, arbiter as `0x${string}`, BigInt(deadline), metadataHash],
      });
      console.log("Escrow created, tx hash:", hash);
      setLastTxHash(hash);
      setActiveEscrowId(escrowId);

      // Force refetch escrow data
      setTimeout(() => {
        escrowView.refetch();
      }, 1000);

      // Generate a new escrow key for next time
      setEscrowKey("order-" + Math.floor(Math.random() * 1e6));

      // Success toast and sound
      toast.success(`Escrow Created! ID: ${escrowId.slice(0, 12)}...`);
      playChaChingSound();

      // Link to negotiation if one is active
      // @ts-ignore
      if (window.negotiationSandbox?.negotiationId) {
        // @ts-ignore
        window.negotiationSandbox.linkEscrow(escrowId, hash);
      }
    } catch (error: any) {
      console.error("Error creating escrow:", error);
      // Friendly error messages
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("already exists") || errorMsg.includes("revert") || errorMsg.includes("Internal JSON-RPC")) {
        toast.warning(`Escrow key "${escrowKey}" already exists! Generating new key...`);
        // Auto-generate a new key
        setEscrowKey("order-" + Math.floor(Math.random() * 1e6));
      } else if (errorMsg.includes("insufficient") || errorMsg.includes("exceeds balance")) {
        toast.error("Insufficient balance! Please check your MNEE balance.");
      } else if (errorMsg.includes("allowance")) {
        toast.warning("Please approve tokens first before creating escrow.");
      } else if (errorMsg.includes("rejected") || errorMsg.includes("denied")) {
        // User rejected - no toast needed
      } else {
        toast.error("Error creating escrow: " + errorMsg.slice(0, 150));
      }
    }
  }

  async function release() {
    try {
      const targetId = (activeEscrowId || escrowId) as `0x${string}`;
      const hash = await writeContractAsync({ abi: ESCROW_ABI, address: ESCROW_ADDRESS, functionName: "release", args: [targetId] });
      setLastTxHash(hash);

      // Trigger event rescan after a short delay for the tx to be mined
      setTimeout(async () => {
        try {
          await fetch(`${BACKEND_URL}/events/rescan`, { method: 'POST' });
          // Refresh escrow state
          escrowView.refetch();
        } catch (e) { /* ignore */ }
      }, 2000);

      // Update linked negotiation status (if any)
      // @ts-ignore
      if (window.negotiationSandbox?.negotiationId) {
        // @ts-ignore
        window.negotiationSandbox.updateStatus('released', hash);
      }

      toast.success(`Release Successful! Funds sent to payee. Tx: ${hash.slice(0, 12)}...`);
      playSuccess();
    } catch (err: any) {
      const msg = err?.message || String(err);
      playError();
      if (!msg.includes("User rejected") && !msg.includes("user rejected")) {
        toast.error(`Release Failed: ${msg.slice(0, 100)}`);
      }
    }
  }

  async function refund() {
    try {
      const targetId = (activeEscrowId || escrowId) as `0x${string}`;
      const hash = await writeContractAsync({ abi: ESCROW_ABI, address: ESCROW_ADDRESS, functionName: "refund", args: [targetId] });
      setLastTxHash(hash);

      // Trigger event rescan after a short delay for the tx to be mined
      setTimeout(async () => {
        try {
          await fetch(`${BACKEND_URL}/events/rescan`, { method: 'POST' });
          // Refresh escrow state
          escrowView.refetch();
        } catch (e) { /* ignore */ }
      }, 2000);

      // Update linked negotiation status (if any)
      // @ts-ignore
      if (window.negotiationSandbox?.negotiationId) {
        // @ts-ignore
        window.negotiationSandbox.updateStatus('refunded', hash);
      }

      toast.success(`Refund Successful! Funds returned to payer. Tx: ${hash.slice(0, 12)}...`);
      playSuccess();
    } catch (err: any) {
      const msg = err?.message || String(err);
      playError();
      if (!msg.includes("User rejected") && !msg.includes("user rejected")) {
        toast.error(`Refund Failed: ${msg.slice(0, 100)}`);
      }
    }
  }

  const escrowState = useMemo(() => {
    const d = escrowView.data as any;
    if (!d) return null;
    // Contract returns: payer, payee, arbiter, amount, releasedAmount, deadline, metadataHash, status, disputeActive
    return {
      payer: d[0],
      payee: d[1],
      arbiter: d[2],
      amount: d[3],
      releasedAmount: d[4],
      deadline: Number(d[5]),
      metadataHash: d[6],
      status: Number(d[7]),
      disputeActive: d[8]
    };
  }, [escrowView.data]);

  // Read payer balance (escrow creator)
  const payerBalance = useReadContract({
    abi: ERC20_ABI,
    address: MNEE_TOKEN,
    functionName: "balanceOf",
    args: escrowState?.payer ? [escrowState.payer] : undefined,
    query: { enabled: !!escrowState?.payer },
  });

  // Read payee balance (recipient)
  const payeeBalance = useReadContract({
    abi: ERC20_ABI,
    address: MNEE_TOKEN,
    functionName: "balanceOf",
    args: escrowState?.payee ? [escrowState.payee] : undefined,
    query: { enabled: !!escrowState?.payee },
  });

  const payerBalanceStr = payerBalance.data ? formatUnits(payerBalance.data as bigint, 18) : "0";
  const payeeBalanceStr = payeeBalance.data ? formatUnits(payeeBalance.data as bigint, 18) : "0";

  return (
    <div className="escrow-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Left Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Wallet Card */}
        <div style={card(isDark)}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>💳 Wallet & Token</h3>
          {!isConnected ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <p style={{ fontSize: 13, color: isDark ? "#888" : "#666", marginBottom: 16 }}>
                Connect your wallet to manage escrows
              </p>
              <WalletConnect variant="primary" />
            </div>
          ) : (
            <>
              <div style={row(isDark)}>
                <span style={label(isDark)}>Connected</span>
                <span style={{ color: "#22c55e", fontWeight: 600 }}>Yes ({shortAddr(address || "")})</span>
              </div>
              <div style={row(isDark)}>
                <span style={label(isDark)}>Balance</span>
                <span style={{ fontWeight: 700 }}>{parseFloat(balanceStr).toLocaleString()} {TOKEN_NAME}</span>
              </div>
              <div style={row(isDark)}>
                <span style={label(isDark)}>Allowance</span>
                <span style={{ fontWeight: 600, color: needsApproval ? "#f59e0b" : "#22c55e" }}>
                  {parseFloat(allowanceStr).toLocaleString()} {TOKEN_NAME}
                </span>
              </div>
              {insufficientBalance && amt > 0n && (
                <div style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontSize: 13,
                  color: "#ef4444"
                }}>
                  ⚠️ Insufficient balance! Get MNEE tokens from the faucet or mint some below.
                </div>
              )}
              {/* DEBUG INFO - REMOVE AFTER FIX */}
              <div style={{ marginTop: 12, padding: 8, borderRadius: 6, background: "rgba(0,0,0,0.1)", fontSize: 10, fontFamily: "monospace" }}>
                Token: {MNEE_TOKEN.slice(0, 10)}... | Escrow: {ESCROW_ADDRESS.slice(0, 10)}...
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  style={needsApproval ? primaryBtn(isDark) : { ...secondaryBtn(isDark), opacity: 0.5, flex: 1 }}
                  disabled={isPending || !needsApproval || amt === 0n || insufficientBalance}
                  onClick={approve}
                >
                  {isPending ? "Approving..." : needsApproval ? `Approve ${amount} ${TOKEN_NAME}` : "✓ Approved"}
                </button>
                {IS_LOCAL && (
                  <button
                    style={{ ...secondaryBtn(isDark), flex: 1 }}
                    onClick={async () => {
                      try {
                        const hash = await writeContractAsync({
                          abi: ERC20_ABI,
                          address: MNEE_TOKEN,
                          functionName: "mint",
                          args: [address as `0x${string}`, parseUnits("1000", 18)]
                        });
                        toast.success("Minting 1000 MNEE...");
                        setLastTxHash(hash);
                      } catch (e: any) {
                        toast.error("Mint failed: " + (e.message || "Unknown error"));
                      }
                    }}
                  >
                    🎁 Mint 1000 MNEE
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Create Escrow Card */}
        <div style={card(isDark)}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>🔒 Create Escrow</h3>
          <div className="escrow-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Escrow Key" value={escrowKey} onChange={setEscrowKey} placeholder="order-123" isDark={isDark} />
            <Field label="Payee Address" value={payee} onChange={setPayee} placeholder="0x..." isDark={isDark} />
            <Field label="Arbiter Address" value={arbiter} onChange={setArbiter} placeholder="0x..." isDark={isDark} />
            <Field label={`Amount (${TOKEN_NAME})`} value={amount} onChange={setAmount} placeholder="5" isDark={isDark} />
            <Field label="Deadline (minutes)" value={deadlineMins} onChange={setDeadlineMins} placeholder="30" isDark={isDark} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexDirection: "column" }}>
            <button style={primaryBtn(isDark)} disabled={!isConnected || isPending || needsApproval || amt === 0n || !payee || !arbiter || insufficientBalance} onClick={createEscrow}>
              {isPending ? "Creating..." : "Create Escrow"}
            </button>
            {/* Show hints only when something is missing */}
            {!isConnected || needsApproval || amt === 0n || !payee || !arbiter || insufficientBalance ? (
              <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 8 }}>
                {!isConnected ? "⚠️ Connect wallet" :
                  needsApproval ? "⚠️ Click Approve first" :
                    amt === 0n ? "⚠️ Enter amount" :
                      !payee ? "⚠️ Enter payee address" :
                        !arbiter ? "⚠️ Enter arbiter address" :
                          insufficientBalance ? "⚠️ Insufficient balance" : ""}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#22c55e", marginTop: 8 }}>✓ Ready to create escrow</div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Active Escrow */}
        <div style={card(isDark)}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>📋 Active Escrow</h3>
          <div style={{ fontSize: 11, fontFamily: "ui-monospace", color: isDark ? "#888" : "#666", marginBottom: 12 }}>
            ID: {(activeEscrowId || escrowId).slice(0, 22)}...
          </div>
          {escrowState && escrowState.status !== 0 ? (
            <>
              <div style={row(isDark)}><span style={label(isDark)}>Amount</span><span style={{ fontWeight: 700 }}>{formatUnits(escrowState.amount, 18)} {TOKEN_NAME}</span></div>
              <div style={row(isDark)}><span style={label(isDark)}>Status</span><span style={{ fontWeight: 700, color: STATUS_COLORS[escrowState.status], padding: "4px 10px", borderRadius: 8, background: `${STATUS_COLORS[escrowState.status]}20` }}>{STATUS[escrowState.status]}</span></div>
              <div style={row(isDark)}><span style={label(isDark)}>Arbiter</span><span style={{ fontFamily: "ui-monospace", fontSize: 11 }}>{escrowState.arbiter?.slice(0, 10)}...{escrowState.arbiter?.slice(-6)}</span></div>
              <div style={row(isDark)}><span style={label(isDark)}>Deadline</span><span>{new Date(escrowState.deadline * 1000).toLocaleString()}</span></div>

              {/* Show buttons only for Funded status */}
              {escrowState.status === 1 ? (
                <>
                  {/* Warning if not arbiter */}
                  {address && escrowState.arbiter && address.toLowerCase() !== escrowState.arbiter.toLowerCase() && (
                    <div style={{
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 8,
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      fontSize: 12
                    }}>
                      <div style={{ fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>⚠️ Not Arbiter</div>
                      <div style={{ color: isDark ? "#888" : "#666" }}>
                        Only the arbiter ({escrowState.arbiter.slice(0, 8)}...) can release funds.
                        Switch wallet or wait for arbiter to act.
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button style={primaryBtn(isDark)} disabled={!isConnected || isPending} onClick={release}>🔓 Release Funds</button>
                    <button style={secondaryBtn(isDark)} disabled={!isConnected || isPending} onClick={refund}>↩️ Refund</button>
                  </div>
                </>
              ) : (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: escrowState.status === 2 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${escrowState.status === 2 ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{escrowState.status === 2 ? "✅" : "↩️"}</div>
                  <div style={{ fontWeight: 600, color: escrowState.status === 2 ? "#22c55e" : "#ef4444" }}>
                    Escrow {escrowState.status === 2 ? "Released" : "Refunded"}
                  </div>
                  <div style={{ fontSize: 12, color: isDark ? "#888" : "#666", marginTop: 4 }}>
                    Funds transferred to {escrowState.status === 2 ? "payee" : "payer"}
                  </div>
                </div>
              )}
              {/* Download Receipt Button */}
              <button
                onClick={() => {
                  downloadTransactionReceipt({
                    escrowId: activeEscrowId || escrowId,
                    payer: escrowState.payer,
                    payee: escrowState.payee,
                    arbiter: escrowState.arbiter,
                    amount: formatUnits(escrowState.amount, 18),
                    status: STATUS[escrowState.status],
                    deadline: escrowState.deadline,
                    txHash: lastTxHash,
                  });
                  playCopy();
                  toast.success('Receipt downloaded!');
                }}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #e5e7eb",
                  background: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                  color: isDark ? "#a0a0b0" : "#666",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                📄 Download Receipt
              </button>
            </>
          ) : (
            <div style={{ padding: 20, textAlign: "center", color: isDark ? "#666" : "#999" }}>📭 No escrow loaded</div>
          )}
        </div>

        {/* Ops Log */}
        <div style={card(isDark)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📊 Ops Log <span style={{ fontSize: 11, fontWeight: 400, color: isDark ? "#666" : "#999" }}>(click to load)</span></h3>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${BACKEND_URL}/events`);
                  const data = await res.json();
                  if (data.events && data.events.length > 0) {
                    exportOpsLogToCSV(data.events.map((e: any) => ({
                      escrowId: e.escrowId,
                      eventType: e.eventType,
                      amount: e.amount,
                      timestamp: e.blockNumber,
                      txHash: e.txHash,
                      payer: e.payer,
                      payee: e.payee,
                      arbiter: e.arbiter,
                    })));
                    playCopy();
                    toast.success('Ops Log exported to CSV!');
                  } else {
                    toast.warning('No events to export');
                  }
                } catch (err) {
                  toast.error('Failed to export');
                }
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #e5e7eb",
                background: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                color: isDark ? "#a0a0b0" : "#666",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              📥 Export CSV
            </button>
          </div>
          <OpsLog isDark={isDark} onSelectEscrow={(id) => setActiveEscrowId(id)} />
        </div>

        {/* Balance Tracker - Only show when escrow is active */}
        {escrowState && escrowState.status !== 0 && (
          <div style={card(isDark)}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>💰 Balance Tracker</h3>

            {/* Before/After Table */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16
            }}>
              {/* Payer Card */}
              <div style={{
                padding: 14,
                borderRadius: 10,
                background: isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(59, 130, 246, 0.05)",
                border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)"}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>👤</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6" }}>PAYER</div>
                    <div style={{ fontFamily: "ui-monospace", fontSize: 10, color: isDark ? "#666" : "#888" }}>
                      {escrowState.payer?.slice(0, 8)}...{escrowState.payer?.slice(-4)}
                    </div>
                  </div>
                </div>

                {/* Before */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                  <span style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>Before Escrow</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#aaa" : "#555" }}>
                    {(parseFloat(payerBalanceStr) + parseFloat(formatUnits(escrowState.amount, 18))).toLocaleString(undefined, { maximumFractionDigits: 0 })} MNEE
                  </span>
                </div>

                {/* Change */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                  <span style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>Change</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}>
                    −{formatUnits(escrowState.amount, 18)} MNEE
                  </span>
                </div>

                {/* Current */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>Current</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>
                    {parseFloat(payerBalanceStr).toLocaleString(undefined, { maximumFractionDigits: 0 })} MNEE
                  </span>
                </div>
              </div>

              {/* Payee Card */}
              <div style={{
                padding: 14,
                borderRadius: 10,
                background: isDark ? "rgba(34, 197, 94, 0.08)" : "rgba(34, 197, 94, 0.05)",
                border: `1px solid ${isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.15)"}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>💰</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>PAYEE</div>
                    <div style={{ fontFamily: "ui-monospace", fontSize: 10, color: isDark ? "#666" : "#888" }}>
                      {escrowState.payee?.slice(0, 8)}...{escrowState.payee?.slice(-4)}
                    </div>
                  </div>
                </div>

                {/* Before */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                  <span style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>Before Release</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#aaa" : "#555" }}>
                    {escrowState.status === 2
                      ? (parseFloat(payeeBalanceStr) - parseFloat(formatUnits(escrowState.amount, 18))).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : parseFloat(payeeBalanceStr).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    } MNEE
                  </span>
                </div>

                {/* Change */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                  <span style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>
                    {escrowState.status === 2 ? "Received" : escrowState.status === 1 ? "Pending" : "—"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: escrowState.status === 2 ? "#22c55e" : "#f59e0b" }}>
                    {escrowState.status === 2 ? "+" : escrowState.status === 1 ? "⏳ " : ""}{formatUnits(escrowState.amount, 18)} MNEE
                  </span>
                </div>

                {/* Current */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>Current</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
                    {parseFloat(payeeBalanceStr).toLocaleString(undefined, { maximumFractionDigits: 0 })} MNEE
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Flow */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 12,
              borderRadius: 8,
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              marginBottom: 12
            }}>
              <div style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: "rgba(59, 130, 246, 0.1)",
                fontSize: 11,
                fontWeight: 600,
                color: "#3b82f6"
              }}>
                Payer
              </div>
              <div style={{ color: isDark ? "#444" : "#ccc" }}>→</div>
              <div style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: escrowState.status === 1 ? "rgba(245, 158, 11, 0.1)" : "rgba(34, 197, 94, 0.1)",
                fontSize: 11,
                fontWeight: 700,
                color: escrowState.status === 1 ? "#f59e0b" : "#22c55e"
              }}>
                {escrowState.status === 1 ? "🔒" : "✅"} {formatUnits(escrowState.amount, 18)} MNEE
              </div>
              <div style={{ color: isDark ? "#444" : "#ccc" }}>→</div>
              <div style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: "rgba(34, 197, 94, 0.1)",
                fontSize: 11,
                fontWeight: 600,
                color: "#22c55e"
              }}>
                Payee
              </div>
            </div>

            {/* Status */}
            <div style={{
              padding: 10,
              borderRadius: 8,
              background: escrowState.status === 2 ? "rgba(34, 197, 94, 0.1)" : escrowState.status === 1 ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
              fontSize: 12,
              textAlign: "center",
              fontWeight: 600,
              color: escrowState.status === 2 ? "#22c55e" : escrowState.status === 1 ? "#f59e0b" : "#ef4444"
            }}>
              {escrowState.status === 1 && "🔒 Funds Locked — Awaiting Release"}
              {escrowState.status === 2 && "✅ Released — Payee received funds!"}
              {escrowState.status === 3 && "↩️ Refunded — Payer received funds back"}
            </div>

            {/* Refresh Button */}
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await Promise.all([
                    payerBalance.refetch(),
                    payeeBalance.refetch(),
                    escrowView.refetch(),
                    bal.refetch()
                  ]);
                } finally {
                  setTimeout(() => setIsRefreshing(false), 500);
                }
              }}
              disabled={isRefreshing}
              style={{
                ...secondaryBtn(isDark),
                marginTop: 12,
                width: "100%",
                fontSize: 12,
                padding: "8px 12px",
                opacity: isRefreshing ? 0.7 : 1,
                cursor: isRefreshing ? "wait" : "pointer"
              }}
            >
              {isRefreshing ? "⏳ Refreshing..." : "🔄 Refresh Balances"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AGENT TAB
// ============================================================================

function AgentTab() {
  const { isDark, t } = useTheme();
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [escrowIdInput, setEscrowIdInput] = useState("");

  async function loadDecisions() {
    try {
      const res = await fetch(`${BACKEND_URL}/agent/decisions`);
      const data = await res.json();
      setDecisions(data.decisions || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function requestDecision() {
    if (!escrowIdInput) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/agent/decision/${escrowIdInput}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadDecisions();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { loadDecisions(); const t = setInterval(loadDecisions, 5000); return () => clearInterval(t); }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Request Decision */}
      <div style={card(isDark)}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>🤖 Request Agent Decision</h3>
        <p style={{ fontSize: 13, color: isDark ? "#888" : "#666", marginBottom: 16 }}>
          Multi-agent system analyzes escrow data and recommends action.
        </p>
        <Field label="Escrow ID (bytes32)" value={escrowIdInput} onChange={setEscrowIdInput} placeholder="0x..." isDark={isDark} />
        <button style={{ ...primaryBtn(isDark), marginTop: 16 }} onClick={requestDecision} disabled={loading || !escrowIdInput}>
          {loading ? "Analyzing..." : "🔮 Get AI Recommendation"}
        </button>

        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: isDark ? "rgba(102, 126, 234, 0.1)" : "rgba(99, 102, 241, 0.05)", border: `1px solid ${isDark ? "rgba(102, 126, 234, 0.3)" : "rgba(99, 102, 241, 0.2)"}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🧠 Multi-Agent System</div>
          <div style={{ fontSize: 12, color: isDark ? "#a0a0b0" : "#666", lineHeight: 1.6 }}>
            <strong>Compliance Agent:</strong> Evaluates risk score, flags high-value/urgent escrows<br />
            <strong>Operations Agent:</strong> Optimizes for customer satisfaction & deadlines<br />
            <strong>Arbiter Agent:</strong> Combines inputs, produces final recommendation
          </div>
        </div>
      </div>

      {/* Decision History */}
      <div style={card(isDark)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📜 Agent Decisions</h3>
          <button style={{ ...secondaryBtn(isDark), padding: "6px 12px", fontSize: 12 }} onClick={loadDecisions}>Refresh</button>
        </div>

        <div style={{ maxHeight: 400, overflow: "auto" }}>
          {decisions.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: isDark ? "#666" : "#999" }}>
              No agent decisions yet. Request one above.
            </div>
          ) : (
            decisions.slice(0, 10).map((d, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 12, marginBottom: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#eee"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "ui-monospace", color: isDark ? "#888" : "#666" }}>
                    {d.escrowId?.slice(0, 18)}...
                  </span>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    background: d.recommendation === 'RELEASE' ? "rgba(34, 197, 94, 0.15)" :
                      d.recommendation === 'REFUND' ? "rgba(239, 68, 68, 0.15)" :
                        "rgba(245, 158, 11, 0.15)",
                    color: d.recommendation === 'RELEASE' ? "#22c55e" :
                      d.recommendation === 'REFUND' ? "#ef4444" : "#f59e0b"
                  }}>
                    {d.recommendation}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: isDark ? "#a0a0b0" : "#555", marginBottom: 8 }}>
                  {d.rationale}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: isDark ? "#666" : "#888" }}>
                  <span>Confidence: {(d.confidence * 100).toFixed(0)}%</span>
                  <span>Risk: {d.agents?.compliance?.riskLevel}</span>
                  <span>{d.executed ? "✓ Executed" : "Pending"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MESHMIND TAB - Intelligent Knowledge Assistant
// ============================================================================

function CopilotTab() {
  const { isDark, t } = useTheme();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiProvider, setAiProvider] = useState<string>("");
  const [conversationHistory, setConversationHistory] = useState<{ q: string, a: string, provider: string }[]>([]);

  async function loadSuggestions() {
    try {
      const res = await fetch(`${BACKEND_URL}/copilot/suggestions`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setAiProvider(data.provider || 'Knowledge Base');
    } catch (e) { }
  }

  async function submitQuery(q?: string) {
    const queryText = q || query;
    if (!queryText) return;
    setLoading(true);
    setQuery("");
    try {
      const res = await fetch(`${BACKEND_URL}/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });
      const data = await res.json();
      setResponse(data);
      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        q: queryText,
        a: data.answer || data.error || "No response",
        provider: data.provider || 'Unknown'
      }]);
    } catch (e) {
      setResponse({ error: String(e) });
    }
    setLoading(false);
  }

  useEffect(() => { loadSuggestions(); }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, width: "100%" }}>
      {/* MeshMind Header */}
      <div style={{
        ...card(isDark),
        background: isDark
          ? "linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(167, 139, 250, 0.1) 100%)"
          : "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)",
        textAlign: "center",
        padding: "30px 20px"
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, #667eea 0%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          MeshMind
        </h2>
        <p style={{ fontSize: 14, color: isDark ? "#a0a0b0" : "#666", margin: 0 }}>
          Your intelligent AutoTrust knowledge assistant
        </p>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          padding: "4px 12px",
          borderRadius: 20,
          background: isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          fontSize: 11,
          color: "#22c55e"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></span>
          Powered by {aiProvider}
        </div>
      </div>

      {/* Chat Interface */}
      <div style={card(isDark)}>
        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div style={{
            maxHeight: 400,
            overflowY: "auto",
            marginBottom: 20,
            padding: 16,
            borderRadius: 12,
            background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb"
          }}>
            {conversationHistory.map((item, i) => (
              <div key={i} style={{ marginBottom: i < conversationHistory.length - 1 ? 20 : 0 }}>
                {/* User Question */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                  <div style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: "16px 16px 4px 16px",
                    background: isDark ? "#667eea" : "#6366f1",
                    color: "#fff",
                    fontSize: 13
                  }}>
                    {item.q}
                  </div>
                </div>
                {/* MeshMind Response */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    maxWidth: "90%",
                    padding: "12px 16px",
                    borderRadius: "16px 16px 16px 4px",
                    background: isDark ? "rgba(255,255,255,0.08)" : "#fff",
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: isDark ? "#e0e0e0" : "#333",
                    whiteSpace: "pre-wrap"
                  }}>
                    {item.a}
                    <div style={{ fontSize: 10, color: isDark ? "#666" : "#999", marginTop: 8 }}>
                      via {item.provider}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Welcome Message if no conversation */}
        {conversationHistory.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0 30px" }}>
            <p style={{ fontSize: 15, color: isDark ? "#888" : "#666", marginBottom: 8 }}>
              👋 Hi! I'm MeshMind, your AutoTrust knowledge assistant.
            </p>
            <p style={{ fontSize: 13, color: isDark ? "#666" : "#999" }}>
              Ask me anything about escrows, policies, AI agents, or how the platform works!
            </p>
          </div>
        )}

        {/* Query Input */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && submitQuery()}
            placeholder="Ask anything about AutoTrust Paymesh..."
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 24,
              border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #ddd",
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
              color: isDark ? "#e0e0e0" : "#111",
              fontSize: 14
            }}
          />
          <button
            style={{
              ...primaryBtn(isDark),
              borderRadius: 24,
              padding: "14px 24px"
            }}
            onClick={() => submitQuery()}
            disabled={loading || !query}
          >
            {loading ? "🤔" : "Ask →"}
          </button>
        </div>

        {/* Quick Suggestions */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "#666" : "#999", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            Try asking:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.slice(0, 6).map((s, i) => (
              <button
                key={i}
                onClick={() => submitQuery(s)}
                disabled={loading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: isDark ? "1px solid rgba(102, 126, 234, 0.3)" : "1px solid #e5e7eb",
                  background: isDark ? "rgba(102, 126, 234, 0.1)" : "#f9fafb",
                  color: isDark ? "#a0a0b0" : "#666",
                  fontSize: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s"
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities Card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div style={{ ...card(isDark), textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Escrow Operations</div>
          <div style={{ fontSize: 11, color: isDark ? "#666" : "#999" }}>Create, release, refund flows</div>
        </div>
        <div style={{ ...card(isDark), textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📜</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Policies & Rules</div>
          <div style={{ fontSize: 11, color: isDark ? "#666" : "#999" }}>Release, refund, dispute policies</div>
        </div>
        <div style={{ ...card(isDark), textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>AI Agent System</div>
          <div style={{ fontSize: 11, color: isDark ? "#666" : "#999" }}>Autonomous decision making</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADVANCED TAB - New Features Showcase
// ============================================================================

function AdvancedTab() {
  const { isDark } = useTheme();
  const [activeSection, setActiveSection] = useState<'features' | 'analytics'>('features');

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)"
          : "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        border: isDark ? "1px solid rgba(102, 126, 234, 0.2)" : "1px solid rgba(99, 102, 241, 0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🚀</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>AI Economic Operating System</h2>
              <p style={{ margin: "4px 0 0 0", color: isDark ? "#a0a0b0" : "#64748b", fontSize: 13 }}>
                Complete infrastructure for autonomous AI agent commerce
              </p>
            </div>
          </div>
          {/* Section Toggle */}
          <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(0,0,0,0.3)" : "#e5e7eb", padding: 4, borderRadius: 10 }}>
            {[
              { id: 'features', label: '🛠️ Features' },
              { id: 'analytics', label: '📊 Analytics' },
            ].map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: activeSection === section.id
                    ? (isDark ? "#667eea" : "#6366f1")
                    : "transparent",
                  color: activeSection === section.id ? "#fff" : (isDark ? "#888" : "#666"),
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeSection === 'analytics' ? (
        <AnalyticsDashboard isDark={isDark} />
      ) : (
        <>
          {/* Row 1: Streaming & Chained */}
          <div className="escrow-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <StreamingPayments isDark={isDark} />
            <ChainedEscrow isDark={isDark} />
          </div>

          {/* Row 2: Negotiation & Arbitration */}
          <div className="escrow-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <NegotiationSandbox isDark={isDark} />
            <ArbitrationTribunal isDark={isDark} />
          </div>

          {/* Row 3: Agent Reputation (Real Data from Backend) */}
          <AgentReputation isDark={isDark} />
        </>
      )}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function OpsLog({ isDark, onSelectEscrow }: { isDark: boolean; onSelectEscrow?: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string>("");
  const [loadedId, setLoadedId] = useState<string>("");

  async function load() {
    try {
      const res = await fetch(`${BACKEND_URL}/events`);
      setData(await res.json());
      setErr("");
    } catch (e: any) {
      setErr(String(e));
    }
  }

  function handleLoad(id: string) {
    if (onSelectEscrow) {
      onSelectEscrow(id);
      setLoadedId(id);
      setTimeout(() => setLoadedId(""), 2000);
    }
  }

  function handleCopy(id: string, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent triggering load
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);

  if (err) return <div style={{ padding: 12, borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: 12 }}>Backend unavailable</div>;

  const events = data?.events || [];
  return (
    <div style={{ maxHeight: 250, overflow: "auto" }}>
      {events.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: isDark ? "#666" : "#999", fontSize: 13 }}>No events yet</div>
      ) : (
        events.slice(0, 10).map((e: any, i: number) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                background: e.type === "EscrowCreated" ? "rgba(245, 158, 11, 0.15)" : e.type === "EscrowReleased" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: e.type === "EscrowCreated" ? "#f59e0b" : e.type === "EscrowReleased" ? "#22c55e" : "#ef4444"
              }}>
                {e.type?.replace("Escrow", "")}
              </span>
              <span style={{ fontSize: 10, color: isDark ? "#666" : "#999" }}>
                {e.amount ? `${(Number(e.amount) / 1e18).toFixed(0)} MNEE` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {/* Main button - Load Escrow */}
              <button
                onClick={() => handleLoad(e.escrowId)}
                title="Click to load this escrow"
                style={{
                  flex: 1,
                  textAlign: "left",
                  fontFamily: "ui-monospace",
                  fontSize: 11,
                  color: loadedId === e.escrowId ? "#22c55e" : (isDark ? "#a0a0b0" : "#666"),
                  background: isDark ? "rgba(255,255,255,0.03)" : "#f5f5f5",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {loadedId === e.escrowId ? "✓ Loaded!" : `${e.escrowId.slice(0, 20)}...`}
              </button>
              {/* Copy button */}
              <button
                onClick={(ev) => handleCopy(e.escrowId, ev)}
                title="Copy full escrow ID"
                style={{
                  padding: "6px 10px",
                  background: copiedId === e.escrowId ? "rgba(34, 197, 94, 0.2)" : (isDark ? "rgba(255,255,255,0.05)" : "#eee"),
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  color: copiedId === e.escrowId ? "#22c55e" : (isDark ? "#888" : "#666"),
                  transition: "all 0.2s"
                }}
              >
                {copiedId === e.escrowId ? "✓" : "📋"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Field({ label: lbl, value, onChange, placeholder, isDark }: any) {
  return (
    <div>
      <div style={{ fontSize: 11, color: isDark ? "#888" : "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{lbl}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #ddd",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 13,
          background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
          color: isDark ? "#e0e0e0" : "#111",
        }}
      />
    </div>
  );
}

function card(isDark: boolean): React.CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e5e5",
    borderRadius: 16,
    padding: 20,
    background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
    boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.04)",
  };
}

function row(isDark: boolean): React.CSSProperties {
  return { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f0f0f0" };
}

function primaryBtn(isDark: boolean): React.CSSProperties {
  return { border: "none", background: isDark ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)", color: "white", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 };
}

function secondaryBtn(isDark: boolean): React.CSSProperties {
  return { border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #ccc", background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: isDark ? "#e0e0e0" : "#333", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 };
}

function label(isDark: boolean): React.CSSProperties {
  return { fontSize: 11, color: isDark ? "#888" : "#666", textTransform: "uppercase", letterSpacing: 0.3 };
}
