'use client';

import React, { useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { ERC20_ABI, MNEE_TOKEN, TOKEN_NAME, NETWORK_NAME, IS_LOCAL, ESCROW_ADDRESS } from "../lib/contracts";
import { formatUnits } from "viem";

const MNEE_SWAP = "https://swap-user.mnee.net/";

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const bal = useReadContract({
    abi: ERC20_ABI,
    address: MNEE_TOKEN,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const balance = useMemo(() => {
    if (!bal.data) return "0";
    return formatUnits(bal.data as bigint, 18);
  }, [bal.data]);

  return (
    <main style={{ minHeight: "100vh", background: IS_LOCAL ? "linear-gradient(145deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)" : "linear-gradient(145deg, #fafafa 0%, #f0f4f8 100%)", color: IS_LOCAL ? "#e0e0e0" : "#111" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        {/* Network Badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 20,
            background: IS_LOCAL ? "rgba(46, 213, 115, 0.15)" : "rgba(99, 102, 241, 0.1)",
            border: `1px solid ${IS_LOCAL ? "#2ed573" : "#6366f1"}`,
            fontSize: 13,
            fontWeight: 600,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: IS_LOCAL ? "#2ed573" : "#6366f1",
              animation: "pulse 2s infinite",
            }} />
            {NETWORK_NAME}
          </div>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ 
              margin: "0 0 8px 0", 
              fontSize: 36, 
              fontWeight: 800,
              fontFamily: "'Space Grotesk', 'SF Pro Display', system-ui",
              background: IS_LOCAL ? "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #4a4a6a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              AutoTrust Paymesh
            </h1>
            <p style={{ margin: 0, color: IS_LOCAL ? "#a0a0b0" : "#555", fontSize: 15 }}>
              Programmable {TOKEN_NAME} escrow with audit-ready Ops Log
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                disabled={isPending}
                style={primaryBtn(IS_LOCAL)}
              >
                {isPending ? "Connecting…" : "Connect Wallet"}
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ 
                  fontSize: 12, 
                  textAlign: "right",
                  padding: "10px 14px",
                  background: IS_LOCAL ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  borderRadius: 12,
                  border: `1px solid ${IS_LOCAL ? "rgba(255,255,255,0.1)" : "#e5e5e5"}`,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Connected</div>
                  <div style={{ fontFamily: "ui-monospace, Menlo", fontSize: 11 }}>
                    {address?.slice(0, 6)}…{address?.slice(-4)}
                  </div>
                </div>
                <button onClick={() => disconnect()} style={secondaryBtn(IS_LOCAL)}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Token Info Card */}
        <div style={card(IS_LOCAL)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 24, alignItems: "end" }}>
            <div>
              <div style={label(IS_LOCAL)}>{TOKEN_NAME} Token Address</div>
              <div style={mono(IS_LOCAL)}>{MNEE_TOKEN}</div>
            </div>
            <div>
              <div style={label(IS_LOCAL)}>Your {TOKEN_NAME} Balance</div>
              <div style={{ 
                fontSize: 28, 
                fontWeight: 800,
                fontFamily: "'Space Grotesk', system-ui",
                color: IS_LOCAL ? "#fff" : "#111",
              }}>
                {isConnected ? (
                  <>
                    {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 6, opacity: 0.6 }}>{TOKEN_NAME}</span>
                  </>
                ) : "—"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/escrow" style={{ textDecoration: "none" }}>
                <button style={primaryBtn(IS_LOCAL)} disabled={!isConnected}>
                  Open Escrow Console →
                </button>
              </a>
              {!IS_LOCAL && (
                <a href={MNEE_SWAP} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <button style={secondaryBtn(IS_LOCAL)}>Get MNEE</button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Contract Info */}
        <div style={{ 
          marginTop: 16, 
          padding: "12px 16px", 
          borderRadius: 12, 
          background: IS_LOCAL ? "rgba(102, 126, 234, 0.1)" : "rgba(99, 102, 241, 0.05)",
          border: `1px solid ${IS_LOCAL ? "rgba(102, 126, 234, 0.3)" : "rgba(99, 102, 241, 0.2)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <span style={{ fontSize: 12, color: IS_LOCAL ? "#a0a0b0" : "#666" }}>Escrow Contract: </span>
            <span style={{ fontFamily: "ui-monospace, Menlo", fontSize: 12, color: IS_LOCAL ? "#667eea" : "#6366f1" }}>{ESCROW_ADDRESS}</span>
          </div>
        </div>

        {/* Feature Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
          <div style={card(IS_LOCAL)}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>Demo Flow</h2>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Approve {TOKEN_NAME} allowance to escrow contract</li>
              <li>Create escrow with unique escrowId</li>
              <li>Release (arbiter) or Refund (arbiter/payer after deadline)</li>
              <li>View on-chain tx hashes in Ops Log</li>
            </ol>
          </div>

          <div style={card(IS_LOCAL)}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>Why This Wins</h2>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Programmable money: conditional settlement</li>
              <li>Auditability: contract emits strong events</li>
              <li>Real coordination: payer/payee/arbiter flow</li>
              <li>Reproducible: clean setup + minimal surface</li>
            </ul>
          </div>
        </div>

        {IS_LOCAL && (
          <div style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            background: "rgba(255, 193, 7, 0.1)",
            border: "1px solid rgba(255, 193, 7, 0.3)",
            fontSize: 13,
          }}>
            <strong style={{ color: "#ffc107" }}>⚡ Local Development Mode</strong>
            <p style={{ margin: "8px 0 0 0", color: "#a0a0b0" }}>
              You're running on Hardhat Local (chain 31337). Make sure the local node is running 
              and you've imported a funded account into MetaMask.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  );
}

function card(isDark: boolean): React.CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e5e5",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
    boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.04)",
  };
}

function primaryBtn(isDark: boolean): React.CSSProperties {
  return {
    border: "none",
    background: isDark ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)",
    color: "white",
    borderRadius: 12,
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    transition: "transform 0.2s, box-shadow 0.2s",
  };
}

function secondaryBtn(isDark: boolean): React.CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #ccc",
    background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
    color: isDark ? "#e0e0e0" : "#333",
    borderRadius: 12,
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  };
}

function label(isDark: boolean): React.CSSProperties {
  return { fontSize: 12, color: isDark ? "#888" : "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
}

function mono(isDark: boolean): React.CSSProperties {
  return { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas", fontSize: 13, wordBreak: "break-all", color: isDark ? "#a0a0b0" : "#444" };
}
