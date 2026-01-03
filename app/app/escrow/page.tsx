'use client';

import React, { useMemo, useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ERC20_ABI, ESCROW_ABI, ESCROW_ADDRESS, MNEE_TOKEN, BACKEND_URL, TOKEN_NAME, NETWORK_NAME, IS_LOCAL, EXPLORER_URL } from "../../lib/contracts";
import { formatUnits, parseUnits, keccak256, toHex } from "viem";
import { shortAddr } from "../../lib/utils";

const STATUS = ["None", "Funded", "Released", "Refunded"] as const;
const STATUS_COLORS = ["#666", "#f59e0b", "#22c55e", "#ef4444"];
const MNEE_SWAP = "https://swap-user.mnee.net/";

export default function EscrowConsole() {
  const { address, isConnected } = useAccount();

  const [payee, setPayee] = useState("");
  const [arbiter, setArbiter] = useState("");
  const [amount, setAmount] = useState("5");
  const [deadlineMins, setDeadlineMins] = useState("30");
  const [escrowKey, setEscrowKey] = useState("order-000000");
  const [activeEscrowId, setActiveEscrowId] = useState<string>("");
  const [lastTxHash, setLastTxHash] = useState<string>("");

  // Generate random escrow key only on client to avoid hydration mismatch
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
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const balanceStr = useMemo(() => bal.data ? formatUnits(bal.data as bigint, 18) : "0", [bal.data]);
  const allowanceStr = useMemo(() => allowance.data ? formatUnits(allowance.data as bigint, 18) : "0", [allowance.data]);

  const needsApproval = useMemo(() => {
    const a = (allowance.data as bigint | undefined) || 0n;
    return a < amt;
  }, [allowance.data, amt]);

  const insufficientBalance = useMemo(() => {
    const b = (bal.data as bigint | undefined) || 0n;
    return b < amt;
  }, [bal.data, amt]);

  async function approve() {
    const hash = await writeContractAsync({
      abi: ERC20_ABI,
      address: MNEE_TOKEN,
      functionName: "approve",
      args: [ESCROW_ADDRESS, amt],
    });
    setLastTxHash(hash);
  }

  async function createEscrow() {
    const deadline = Math.floor(Date.now() / 1000) + (Number(deadlineMins || "0") * 60);
    const hash = await writeContractAsync({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "createEscrow",
      args: [escrowId, payee as `0x${string}`, amt, arbiter as `0x${string}`, deadline],
    });
    setLastTxHash(hash);
    setActiveEscrowId(escrowId);
  }

  async function release() {
    const hash = await writeContractAsync({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "release",
      args: [(activeEscrowId || escrowId) as `0x${string}`],
    });
    setLastTxHash(hash);
  }

  async function refund() {
    const hash = await writeContractAsync({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "refund",
      args: [(activeEscrowId || escrowId) as `0x${string}`],
    });
    setLastTxHash(hash);
  }

  const escrowState = useMemo(() => {
    const d = escrowView.data as any;
    if (!d) return null;
    return {
      payer: d[0] as string,
      payee: d[1] as string,
      arbiter: d[2] as string,
      amount: d[3] as bigint,
      deadline: Number(d[4]),
      status: Number(d[5]),
    };
  }, [escrowView.data]);

  return (
    <main style={{ 
      minHeight: "100vh", 
      background: IS_LOCAL 
        ? "linear-gradient(145deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)" 
        : "linear-gradient(145deg, #fafafa 0%, #f0f4f8 100%)", 
      color: IS_LOCAL ? "#e0e0e0" : "#111" 
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div>
            <a href="/" style={{ color: IS_LOCAL ? "#667eea" : "#6366f1", textDecoration: "none", fontSize: 14 }}>
              ← Back to Home
            </a>
            <h1 style={{ 
              margin: "8px 0 6px 0", 
              fontSize: 28, 
              fontWeight: 800,
              fontFamily: "'Space Grotesk', system-ui",
            }}>
              Escrow Console
            </h1>
            <p style={{ margin: 0, color: IS_LOCAL ? "#888" : "#666", fontSize: 14 }}>
              Approve → Create → Release/Refund • All on-chain and auditable
            </p>
          </div>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 16,
              background: IS_LOCAL ? "rgba(46, 213, 115, 0.15)" : "rgba(99, 102, 241, 0.1)",
              border: `1px solid ${IS_LOCAL ? "#2ed573" : "#6366f1"}`,
              fontSize: 12,
              fontWeight: 600,
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: IS_LOCAL ? "#2ed573" : "#6366f1",
              }} />
              {NETWORK_NAME}
            </div>
            {!IS_LOCAL && (
              <a href={MNEE_SWAP} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={secondaryBtn(IS_LOCAL)}>Get MNEE</button>
              </a>
            )}
          </div>
        </div>

        {/* Last TX notification */}
        {lastTxHash && (
          <div style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: IS_LOCAL ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <span style={{ fontWeight: 600, color: "#22c55e" }}>
                {isConfirming ? "⏳ Confirming..." : "✓ Transaction sent"}
              </span>
              <span style={{ marginLeft: 12, fontFamily: "ui-monospace", fontSize: 12, color: IS_LOCAL ? "#888" : "#666" }}>
                {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
              </span>
            </div>
            {EXPLORER_URL && (
              <a 
                href={`${EXPLORER_URL}/tx/${lastTxHash}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: "#22c55e", fontSize: 13 }}
              >
                View on Etherscan →
              </a>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Wallet + Token Panel */}
          <div style={card(IS_LOCAL)}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>💳</span> Wallet & Token
            </h2>
            
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>Connected</span>
              <span style={{ color: isConnected ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                {isConnected ? "Yes" : "No"}
              </span>
            </div>
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>Address</span>
              <span style={mono(IS_LOCAL)}>{address || "—"}</span>
            </div>
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>{TOKEN_NAME} Token</span>
              <span style={mono(IS_LOCAL)}>{shortAddr(MNEE_TOKEN)}</span>
            </div>
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>Escrow Contract</span>
              <span style={mono(IS_LOCAL)}>{shortAddr(ESCROW_ADDRESS)}</span>
            </div>
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>Balance</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                {isConnected ? `${parseFloat(balanceStr).toLocaleString()} ${TOKEN_NAME}` : "—"}
              </span>
            </div>
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>Allowance</span>
              <span style={{ fontWeight: 600, color: needsApproval ? "#f59e0b" : "#22c55e" }}>
                {isConnected ? `${parseFloat(allowanceStr).toLocaleString()} ${TOKEN_NAME}` : "—"}
              </span>
            </div>

            {insufficientBalance && amt > 0n && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", fontSize: 13, color: "#ef4444" }}>
                ⚠️ Insufficient {TOKEN_NAME} balance
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button 
                style={needsApproval ? primaryBtn(IS_LOCAL) : { ...secondaryBtn(IS_LOCAL), opacity: 0.5 }}
                disabled={!isConnected || isPending || !needsApproval || amt === 0n}
                onClick={approve}
              >
                {isPending ? "Approving..." : needsApproval ? `Approve ${amount} ${TOKEN_NAME}` : "✓ Approved"}
              </button>
            </div>
          </div>

          {/* Create Escrow Panel */}
          <div style={card(IS_LOCAL)}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔒</span> Create Escrow
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Escrow Key" value={escrowKey} onChange={setEscrowKey} placeholder="order-123" isDark={IS_LOCAL} />
              <div>
                <div style={label(IS_LOCAL)}>EscrowId (bytes32)</div>
                <div style={{ ...mono(IS_LOCAL), fontSize: 11, padding: "10px 0" }}>{escrowId.slice(0, 22)}...</div>
              </div>
              <Field label="Payee Address" value={payee} onChange={setPayee} placeholder="0x..." isDark={IS_LOCAL} />
              <Field label="Arbiter Address" value={arbiter} onChange={setArbiter} placeholder="0x..." isDark={IS_LOCAL} />
              <Field label={`Amount (${TOKEN_NAME})`} value={amount} onChange={setAmount} placeholder="5" isDark={IS_LOCAL} />
              <Field label="Deadline (minutes)" value={deadlineMins} onChange={setDeadlineMins} placeholder="30" isDark={IS_LOCAL} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button 
                style={primaryBtn(IS_LOCAL)}
                disabled={!isConnected || isPending || needsApproval || amt === 0n || !payee || !arbiter || insufficientBalance}
                onClick={createEscrow}
              >
                {isPending ? "Creating..." : "Create Escrow"}
              </button>
              <button 
                style={secondaryBtn(IS_LOCAL)}
                disabled={!isConnected || isPending}
                onClick={() => setActiveEscrowId(escrowId)}
              >
                Load This Escrow
              </button>
            </div>

            {needsApproval && amt > 0n && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#f59e0b" }}>
                ⚠️ Approve allowance first before creating escrow
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
          {/* Active Escrow Status */}
          <div style={card(IS_LOCAL)}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📋</span> Active Escrow
            </h2>
            
            <div style={row(IS_LOCAL)}>
              <span style={label(IS_LOCAL)}>Active EscrowId</span>
              <span style={{ ...mono(IS_LOCAL), fontSize: 11 }}>{(activeEscrowId || escrowId).slice(0, 22)}...</span>
            </div>

            {escrowState && escrowState.status !== 0 ? (
              <>
                <div style={row(IS_LOCAL)}>
                  <span style={label(IS_LOCAL)}>Payer</span>
                  <span style={mono(IS_LOCAL)}>{shortAddr(escrowState.payer)}</span>
                </div>
                <div style={row(IS_LOCAL)}>
                  <span style={label(IS_LOCAL)}>Payee</span>
                  <span style={mono(IS_LOCAL)}>{shortAddr(escrowState.payee)}</span>
                </div>
                <div style={row(IS_LOCAL)}>
                  <span style={label(IS_LOCAL)}>Arbiter</span>
                  <span style={mono(IS_LOCAL)}>{shortAddr(escrowState.arbiter)}</span>
                </div>
                <div style={row(IS_LOCAL)}>
                  <span style={label(IS_LOCAL)}>Amount</span>
                  <span style={{ fontWeight: 700 }}>{formatUnits(escrowState.amount, 18)} {TOKEN_NAME}</span>
                </div>
                <div style={row(IS_LOCAL)}>
                  <span style={label(IS_LOCAL)}>Deadline</span>
                  <span>{new Date(escrowState.deadline * 1000).toLocaleString()}</span>
                </div>
                <div style={row(IS_LOCAL)}>
                  <span style={label(IS_LOCAL)}>Status</span>
                  <span style={{ 
                    fontWeight: 700, 
                    color: STATUS_COLORS[escrowState.status],
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: `${STATUS_COLORS[escrowState.status]}20`,
                  }}>
                    {STATUS[escrowState.status] || "Unknown"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button 
                    style={primaryBtn(IS_LOCAL)}
                    disabled={!isConnected || isPending || escrowState.status !== 1}
                    onClick={release}
                  >
                    {isPending ? "Processing..." : "Release to Payee"}
                  </button>
                  <button 
                    style={secondaryBtn(IS_LOCAL)}
                    disabled={!isConnected || isPending || escrowState.status !== 1}
                    onClick={refund}
                  >
                    Refund to Payer
                  </button>
                </div>

                {escrowState.status !== 1 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: IS_LOCAL ? "#888" : "#666" }}>
                    Escrow is already {STATUS[escrowState.status].toLowerCase()}.
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: IS_LOCAL ? "#666" : "#999" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No escrow loaded. Create one above or enter an escrow key to load.
              </div>
            )}
          </div>

          {/* Ops Log */}
          <div style={card(IS_LOCAL)}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📊</span> Ops Log
            </h2>
            <div style={{ fontSize: 12, color: IS_LOCAL ? "#666" : "#888", marginBottom: 12 }}>
              Backend: <span style={mono(IS_LOCAL)}>{BACKEND_URL}</span>
            </div>
            <OpsLog isDark={IS_LOCAL} />
          </div>
        </div>
      </div>
    </main>
  );
}

function OpsLog({ isDark }: { isDark: boolean }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  async function load() {
    setErr("");
    try {
      const res = await fetch(`${BACKEND_URL}/events`);
      const j = await res.json();
      setData(j);
    } catch (e: any) {
      setErr(String(e));
    }
  }

  React.useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);

  if (err) return (
    <div style={{ padding: 16, borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: 13 }}>
      ⚠️ Backend unavailable: {err}
    </div>
  );

  const events = data?.events || [];
  
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: isDark ? "#666" : "#888" }}>Auto-refresh every 4s</div>
        <button style={{ ...secondaryBtn(isDark), padding: "6px 12px", fontSize: 12 }} onClick={load}>
          Refresh
        </button>
      </div>

      <div style={{ 
        maxHeight: 280, 
        overflow: "auto", 
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #eee", 
        borderRadius: 12,
        background: isDark ? "rgba(0,0,0,0.2)" : "#fafafa",
      }}>
        {events.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: isDark ? "#666" : "#999" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            No events yet. Create and settle an escrow.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }}>
                <th style={th(isDark)}>Type</th>
                <th style={th(isDark)}>EscrowId</th>
                <th style={th(isDark)}>Tx</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 15).map((e: any, i: number) => (
                <tr key={i} style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #eee" }}>
                  <td style={td(isDark)}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: e.type === "EscrowCreated" ? "rgba(245, 158, 11, 0.15)" :
                                  e.type === "EscrowReleased" ? "rgba(34, 197, 94, 0.15)" :
                                  "rgba(239, 68, 68, 0.15)",
                      color: e.type === "EscrowCreated" ? "#f59e0b" :
                             e.type === "EscrowReleased" ? "#22c55e" :
                             "#ef4444",
                    }}>
                      {e.type.replace("Escrow", "")}
                    </span>
                  </td>
                  <td style={{ ...td(isDark), fontFamily: "ui-monospace", fontSize: 10 }}>
                    {e.escrowId?.slice(0, 14)}...
                  </td>
                  <td style={td(isDark)}>
                    {EXPLORER_URL ? (
                      <a href={`${EXPLORER_URL}/tx/${e.txHash}`} target="_blank" rel="noreferrer" style={{ color: isDark ? "#667eea" : "#6366f1" }}>
                        View
                      </a>
                    ) : (
                      <span style={{ fontFamily: "ui-monospace", fontSize: 10 }}>{e.txHash?.slice(0, 10)}...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label: lbl, value, onChange, placeholder, isDark }: any) {
  return (
    <div>
      <div style={label(isDark)}>{lbl}</div>
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
  return { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    gap: 10, 
    padding: "8px 0", 
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f0f0f0" 
  };
}

function primaryBtn(isDark: boolean): React.CSSProperties {
  return {
    border: "none",
    background: isDark ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)",
    color: "white",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  };
}

function secondaryBtn(isDark: boolean): React.CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #ccc",
    background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
    color: isDark ? "#e0e0e0" : "#333",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  };
}

function label(isDark: boolean): React.CSSProperties {
  return { fontSize: 11, color: isDark ? "#888" : "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
}

function mono(isDark: boolean): React.CSSProperties {
  return { fontFamily: "ui-monospace, SFMono-Regular, Menlo", fontSize: 12, color: isDark ? "#a0a0b0" : "#555" };
}

function th(isDark: boolean): React.CSSProperties {
  return { padding: 10, fontWeight: 600, textAlign: "left", fontSize: 11, color: isDark ? "#888" : "#666" };
}

function td(isDark: boolean): React.CSSProperties {
  return { padding: 10, verticalAlign: "middle" };
}
