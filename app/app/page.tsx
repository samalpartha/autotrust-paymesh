'use client';

import React, { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ERC20_ABI, MNEE_TOKEN, TOKEN_NAME, NETWORK_NAME, IS_LOCAL, ESCROW_ADDRESS, formatMNEE } from "../lib/contracts";
import { WalletConnect } from "../components/WalletConnect";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { Logo, HeroLogo } from "../components/Logo";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isDark, t } = useTheme();

  const bal = useReadContract({
    abi: ERC20_ABI,
    address: MNEE_TOKEN,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const balance = useMemo(() => {
    if (!bal.data) return "0";
    return formatMNEE(bal.data as bigint);
  }, [bal.data]);

  return (
    <main style={{ 
      minHeight: "100vh", 
      background: isDark 
        ? "radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a1a 50%, #050510 100%)"
        : "radial-gradient(ellipse at top, #f8fafc 0%, #e2e8f0 100%)",
      color: isDark ? "#e0e0e0" : "#111",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Animated background elements */}
      {isDark && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }} />
          <div style={{
            position: "absolute",
            bottom: "20%",
            right: "10%",
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(118, 75, 162, 0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }} />
        </div>
      )}

      <div style={{ width: "100%", padding: "40px 48px", position: "relative", boxSizing: "border-box" }}>
        {/* Header with network + wallet + theme toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 20,
            background: isDark ? "rgba(46, 213, 115, 0.1)" : "rgba(99, 102, 241, 0.08)",
            border: `1px solid ${isDark ? "rgba(46, 213, 115, 0.3)" : "rgba(99, 102, 241, 0.2)"}`,
            fontSize: 12,
            fontWeight: 500,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDark ? "#2ed573" : "#6366f1" }} />
            {NETWORK_NAME}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            {isConnected && <WalletConnect variant="header" />}
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          {/* Centered Spider Web Logo */}
          <div style={{ marginBottom: 24 }}>
            <HeroLogo size={140} isDark={isDark} />
          </div>

          <div style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: isDark ? "#667eea" : "#6366f1",
            marginBottom: 16,
            letterSpacing: 2.5,
            textTransform: "uppercase",
          }}>
            {t('home.tagline')}
          </div>
          
          <h1 style={{ 
            margin: "0 0 20px 0", 
            fontSize: 48, 
            fontWeight: 800,
            fontFamily: "'Inter', 'SF Pro Display', system-ui",
            lineHeight: 1.15,
            letterSpacing: -1.5,
          }}>
            <span style={isDark ? {
              background: "linear-gradient(135deg, #fff 0%, #a0a0c0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            } : {
              color: "#1e293b",
            }}>
              {t('home.title1')}
            </span>
            <br />
            <span style={isDark ? {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            } : {
              color: "#6366f1",
            }}>
              {t('home.title2')}
            </span>
          </h1>
          
          <p style={{ 
            fontSize: 17, 
            color: isDark ? "#8888a0" : "#64748b", 
            maxWidth: 650, 
            margin: "0 auto 36px",
            lineHeight: 1.7,
          }}>
            {t('home.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {!isConnected ? (
              <WalletConnect variant="primary" />
            ) : (
              <a href="/escrow" style={{ textDecoration: "none" }}>
                <button style={primaryBtn(isDark)}>
                  {t('home.openConsole')}
                </button>
              </a>
            )}
            <a 
              href="https://github.com/samalpartha/autotrust-paymesh" 
              target="_blank" 
              rel="noreferrer" 
              style={{ textDecoration: "none" }}
            >
              <button style={secondaryBtn(isDark)}>
                {t('home.viewCode')}
              </button>
            </a>
          </div>
        </div>

        {/* Connected wallet card */}
        {isConnected && (
          <div style={{
            maxWidth: 500,
            margin: "0 auto 60px",
            padding: 28,
            borderRadius: 20,
            background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
            backdropFilter: "blur(20px)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: isDark ? "#666" : "#94a3b8", marginBottom: 4 }}>
                  {t('common.wallet')}
                </div>
                <div style={{ fontFamily: "ui-monospace", fontSize: 14, fontWeight: 500 }}>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: isDark ? "#666" : "#94a3b8", marginBottom: 4 }}>
                  {TOKEN_NAME}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Inter', system-ui" }}>
                  {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            <button 
              onClick={() => {}} 
              style={{ 
                marginTop: 16, 
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
                background: "transparent",
                color: isDark ? "#888" : "#64748b",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t('common.disconnect')}
            </button>
          </div>
        )}

        {/* Features - clean grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: 24,
          marginBottom: 60,
        }}>
          <FeatureCard
            isDark={isDark}
            icon="🤖"
            title={t('home.feature1.title')}
            description={t('home.feature1.desc')}
          />
          <FeatureCard
            isDark={isDark}
            icon="💬"
            title={t('home.feature2.title')}
            description={t('home.feature2.desc')}
          />
          <FeatureCard
            isDark={isDark}
            icon="⚡"
            title={t('home.feature3.title')}
            description={t('home.feature3.desc')}
          />
        </div>

        {/* How it works - minimal */}
        <div style={{
          padding: 32,
          borderRadius: 24,
          background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
          marginBottom: 60,
        }}>
          <h2 style={{ 
            margin: "0 0 32px 0", 
            fontSize: 14, 
            fontWeight: 600, 
            textAlign: "center",
            color: isDark ? "#666" : "#94a3b8",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}>
            {t('home.howItWorks')}
          </h2>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Step num={1} title={t('home.step1.title')} desc={t('home.step1.desc')} isDark={isDark} />
            <Arrow isDark={isDark} />
            <Step num={2} title={t('home.step2.title')} desc={t('home.step2.desc')} isDark={isDark} />
            <Arrow isDark={isDark} />
            <Step num={3} title={t('home.step3.title')} desc={t('home.step3.desc')} isDark={isDark} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: 20,
          marginBottom: 60,
        }}>
          <Stat label="Token" value={TOKEN_NAME} isDark={isDark} />
          <Stat label="Chain" value={IS_LOCAL ? "Local" : "Ethereum"} isDark={isDark} />
          <Stat label="Agents" value="3" isDark={isDark} />
          <Stat label="Endpoints" value="12+" isDark={isDark} />
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: "center", 
          paddingTop: 40,
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
        }}>
          <div style={{ 
            fontFamily: "ui-monospace", 
            fontSize: 11, 
            color: isDark ? "#444" : "#94a3b8",
            marginBottom: 8,
          }}>
            Escrow: {ESCROW_ADDRESS?.slice(0, 10)}...{ESCROW_ADDRESS?.slice(-8)}
          </div>
          <div style={{ fontSize: 12, color: isDark ? "#333" : "#cbd5e1" }}>
            {t('home.footer')}
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ isDark, icon, title, description }: { 
  isDark: boolean; 
  icon: string; 
  title: string; 
  description: string 
}) {
  return (
    <div style={{
      padding: 28,
      borderRadius: 20,
      background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}>
      <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 14, color: isDark ? "#666" : "#64748b", lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

function Step({ num, title, desc, isDark }: { 
  num: number; 
  title: string; 
  desc: string; 
  isDark: boolean 
}) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: isDark 
          ? "linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)"
          : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 12px",
        fontSize: 18,
        fontWeight: 700,
        color: isDark ? "#667eea" : "#fff",
      }}>
        {num}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: isDark ? "#666" : "#64748b" }}>{desc}</div>
    </div>
  );
}

function Arrow({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ 
      color: isDark ? "#333" : "#cbd5e1", 
      fontSize: 20,
      padding: "0 8px",
    }}>
      →
    </div>
  );
}

function Stat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#e2e8f0"}`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 12, color: isDark ? "#555" : "#94a3b8", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function primaryBtn(isDark: boolean): React.CSSProperties {
  return {
    border: "none",
    background: isDark 
      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
      : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "white",
    borderRadius: 12,
    padding: "14px 28px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
    boxShadow: isDark 
      ? "0 4px 24px rgba(102, 126, 234, 0.25)"
      : "0 4px 24px rgba(99, 102, 241, 0.25)",
  };
}

function secondaryBtn(isDark: boolean): React.CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #e2e8f0",
    background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
    color: isDark ? "#a0a0b0" : "#475569",
    borderRadius: 12,
    padding: "14px 28px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  };
}
