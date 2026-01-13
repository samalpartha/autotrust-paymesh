'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from 'wagmi';
import {
  CHAIN_ID,
  NETWORK_NAME,
  IS_LOCAL,
  shortAddress,
  MNEE_SWAP_URL,
  MNEE_TOKEN,
  formatMNEE,
  getAddressExplorerUrl,
  EXPLORER_URL
} from '../lib/contracts';
import { getSimpleGasPrice, getCongestionColor } from '../lib/gas';
import { RPC_URL } from '../lib/config';
import { useTheme } from '../context/ThemeContext';

interface WalletConnectProps {
  variant?: 'primary' | 'header';
}

export function WalletConnect({ variant = 'primary' }: WalletConnectProps) {
  const [showModal, setShowModal] = useState(false);
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const { t } = useTheme();
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // ETH balance
  const { data: ethBalance } = useBalance({
    address,
  });

  // MNEE balance
  const { data: mneeBalance } = useBalance({
    address,
    token: MNEE_TOKEN,
  });

  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  // Fetch gas price periodically
  useEffect(() => {
    const fetchGas = async () => {
      const rpcUrl = IS_LOCAL ? RPC_URL : undefined;
      const price = await getSimpleGasPrice(rpcUrl);
      setGasPrice(price);
    };

    fetchGas();
    const interval = setInterval(fetchGas, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Close modal on successful connection
  useEffect(() => {
    if (isConnected) {
      setShowModal(false);
    }
  }, [isConnected]);

  if (isConnected) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowModal(!showModal)}
          style={connectedBtnStyle(IS_LOCAL)}
        >
          <span style={dotStyle(isWrongNetwork ? '#ef4444' : '#22c55e')} />
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
              {shortAddress(address || '')}
            </span>
            {mneeBalance && (
              <span style={{ fontSize: 10, color: IS_LOCAL ? '#888' : '#666' }}>
                {formatMNEE(mneeBalance.value)} MNEE
              </span>
            )}
          </span>
          <span style={{ marginLeft: 4, fontSize: 10 }}>▼</span>
        </button>

        {showModal && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setShowModal(false)}
            />
            <div style={dropdownStyle(IS_LOCAL)}>
              <div style={dropdownHeader(IS_LOCAL)}>
                <span style={{ fontSize: 12, color: IS_LOCAL ? '#888' : '#666' }}>Connected via</span>
                <span style={{ fontWeight: 600 }}>{connector?.name || 'Wallet'}</span>
              </div>

              <div style={dropdownItem(IS_LOCAL)}>
                <span style={{ fontSize: 12, color: IS_LOCAL ? '#888' : '#666' }}>Network</span>
                <span style={{
                  fontWeight: 600,
                  color: isWrongNetwork ? '#ef4444' : '#22c55e'
                }}>
                  {isWrongNetwork ? `Wrong (${chainId})` : NETWORK_NAME}
                </span>
              </div>

              {/* Balances */}
              <div style={{ ...dropdownItem(IS_LOCAL), flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: IS_LOCAL ? '#888' : '#666' }}>ETH Balance</span>
                  <span style={{ fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
                    {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '—'} ETH
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: IS_LOCAL ? '#888' : '#666' }}>MNEE Balance</span>
                  <span style={{ fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: '#667eea' }}>
                    {mneeBalance ? formatMNEE(mneeBalance.value) : '—'} MNEE
                  </span>
                </div>
              </div>

              {/* Gas Price */}
              <div style={dropdownItem(IS_LOCAL)}>
                <span style={{ fontSize: 12, color: IS_LOCAL ? '#888' : '#666' }}>⛽ Gas Price</span>
                <span style={{
                  fontWeight: 600,
                  fontFamily: 'ui-monospace, monospace',
                  color: gasPrice ? getCongestionColor(parseFloat(gasPrice) < 20 ? 'low' : parseFloat(gasPrice) < 50 ? 'medium' : 'high') : '#888'
                }}>
                  {gasPrice ? `${gasPrice} Gwei` : '—'}
                </span>
              </div>

              {isWrongNetwork && (
                <button
                  onClick={() => switchChain?.({ chainId: CHAIN_ID })}
                  style={switchNetworkBtn(IS_LOCAL)}
                >
                  Switch to {NETWORK_NAME}
                </button>
              )}

              {/* Explorer link */}
              {EXPLORER_URL && address && (
                <a
                  href={getAddressExplorerUrl(address) || '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ ...dropdownItem(IS_LOCAL), cursor: 'pointer' }}>
                    <span>🔍 View on Etherscan</span>
                    <span style={{ fontSize: 12 }}>→</span>
                  </div>
                </a>
              )}

              <a
                href={MNEE_SWAP_URL}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ ...dropdownItem(IS_LOCAL), cursor: 'pointer' }}>
                  <span>💰 Get MNEE Tokens</span>
                  <span style={{ fontSize: 12 }}>→</span>
                </div>
              </a>

              <button
                onClick={() => { disconnect(); setShowModal(false); }}
                style={disconnectBtn(IS_LOCAL)}
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={variant === 'primary' ? primaryBtnStyle(IS_LOCAL) : headerBtnStyle(IS_LOCAL)}
      >
        {t('common.connectWallet')}
      </button>

      {showModal && (
        <div style={modalOverlay()} onClick={() => setShowModal(false)}>
          <div style={modalContent(IS_LOCAL)} onClick={e => e.stopPropagation()}>
            <div style={modalHeader(IS_LOCAL)}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{t('common.connectWallet')}</h3>
              <button onClick={() => setShowModal(false)} style={closeBtn(IS_LOCAL)}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: IS_LOCAL ? '#888' : '#666', marginBottom: 20 }}>
              {t('wallet.connectDesc').replace('{network}', NETWORK_NAME)}
            </p>

            {IS_LOCAL && (
              <div style={localWarning()}>
                <span style={{ fontSize: 16 }}>🛠️</span>
                <div>
                  <strong>Local Development Mode</strong>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Add network in MetaMask: RPC <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: 4 }}>{IS_LOCAL ? 'https://autotrust-chain-108816008638.us-central1.run.app' : 'https://autotrust-chain-108816008638.us-central1.run.app'}</code>, Chain ID <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: 4 }}>31337</code>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  style={walletOption(IS_LOCAL)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = IS_LOCAL ? 'rgba(255,255,255,0.08)' : '#f0f0f0';
                    e.currentTarget.style.borderColor = IS_LOCAL ? 'rgba(102, 126, 234, 0.5)' : '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = IS_LOCAL ? 'rgba(255,255,255,0.03)' : '#f8f8f8';
                    e.currentTarget.style.borderColor = IS_LOCAL ? 'rgba(255,255,255,0.1)' : '#e5e5e5';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {getWalletIcon(connector.name)}
                    <span>{connector.name}</span>
                  </span>
                  {isPending && <span style={{ fontSize: 12, color: '#667eea' }}>Connecting...</span>}
                </button>
              ))}
            </div>

            {error && (
              <div style={errorStyle()}>
                {error.message.includes('rejected')
                  ? 'Connection rejected by user'
                  : error.message.slice(0, 100)}
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: IS_LOCAL ? '#667eea' : '#6366f1' }}
              >
                Don't have a wallet? Get MetaMask →
              </a>
            </div>

            {/* Gas indicator */}
            {gasPrice && (
              <div style={{
                marginTop: 16,
                padding: '10px 12px',
                background: IS_LOCAL ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12
              }}>
                <span style={{ color: IS_LOCAL ? '#888' : '#666' }}>⛽ Current Gas</span>
                <span style={{
                  fontWeight: 600,
                  color: getCongestionColor(parseFloat(gasPrice) < 20 ? 'low' : parseFloat(gasPrice) < 50 ? 'medium' : 'high')
                }}>
                  {gasPrice} Gwei
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getWalletIcon(name: string): React.ReactNode {
  if (name.toLowerCase().includes('metamask')) {
    return <span style={{ fontSize: 24 }}>🦊</span>;
  }
  if (name.toLowerCase().includes('coinbase')) {
    return <span style={{ fontSize: 24 }}>💎</span>;
  }
  if (name.toLowerCase().includes('walletconnect')) {
    return <span style={{ fontSize: 24 }}>🔗</span>;
  }
  if (name.toLowerCase().includes('injected')) {
    return <span style={{ fontSize: 24 }}>🌐</span>;
  }
  return <span style={{ fontSize: 24 }}>👛</span>;
}

// Styles
function primaryBtnStyle(isDark: boolean): React.CSSProperties {
  return {
    border: 'none',
    background: isDark
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    borderRadius: 12,
    padding: '14px 28px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 15,
    boxShadow: isDark
      ? '0 4px 24px rgba(102, 126, 234, 0.25)'
      : '0 4px 24px rgba(99, 102, 241, 0.25)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };
}

function headerBtnStyle(isDark: boolean): React.CSSProperties {
  return {
    border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    color: isDark ? '#e0e0e0' : '#111',
    borderRadius: 10,
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
  };
}

function connectedBtnStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #22c55e',
    background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
    color: isDark ? '#e0e0e0' : '#111',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 13,
  };
}

function dotStyle(color: string): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  };
}

function dropdownStyle(isDark: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    minWidth: 260,
    background: isDark ? '#1a1a2e' : '#fff',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e5e5',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    padding: 8,
    zIndex: 100,
  };
}

function dropdownHeader(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #eee',
  };
}

function dropdownItem(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 12px',
    fontSize: 13,
  };
}

function switchNetworkBtn(isDark: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    margin: '4px 0',
    border: 'none',
    borderRadius: 8,
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  };
}

function disconnectBtn(isDark: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    marginTop: 8,
    border: 'none',
    borderRadius: 8,
    background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  };
}

function modalOverlay(): React.CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  };
}

function modalContent(isDark: boolean): React.CSSProperties {
  return {
    background: isDark ? '#1a1a2e' : '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e5e5',
  };
}

function modalHeader(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  };
}

function closeBtn(isDark: boolean): React.CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    fontSize: 20,
    cursor: 'pointer',
    color: isDark ? '#888' : '#666',
  };
}

function localWarning(): React.CSSProperties {
  return {
    display: 'flex',
    gap: 12,
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    fontSize: 13,
  };
}

function walletOption(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e5e5',
    borderRadius: 12,
    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
    transition: 'all 0.2s',
  };
}

function errorStyle(): React.CSSProperties {
  return {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: 13,
  };
}

export default WalletConnect;
