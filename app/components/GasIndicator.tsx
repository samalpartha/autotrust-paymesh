'use client';

import React, { useState, useEffect } from 'react';
import { fetchGasPrices, formatGasPrice, getCongestionColor, getSimpleGasPrice, type GasPrices, type SimpleGasPrice } from '../lib/gas';
import { IS_LOCAL } from '../lib/contracts';

interface GasIndicatorProps {
  showDetails?: boolean;
  style?: React.CSSProperties;
}

export function GasIndicator({ showDetails = false, style }: GasIndicatorProps) {
  const [gasPrices, setGasPrices] = useState<GasPrices | null>(null);
  const [simpleGas, setSimpleGas] = useState<string | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (IS_LOCAL) {
        // For local network, just get simple gas price
        const price = await getSimpleGasPrice("http://127.0.0.1:8545");
        setSimpleGas(price);
      } else {
        // For mainnet, get full gas prices from Infura Gas API
        const prices = await fetchGasPrices();
        setGasPrices(prices);
        
        // Also get simple gas as fallback
        const simple = await getSimpleGasPrice();
        setSimpleGas(simple);
      }
      
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 12000); // Every 12 seconds (roughly 1 block)
    return () => clearInterval(interval);
  }, []);

  const formattedGas = formatGasPrice(gasPrices, selectedSpeed);

  if (loading) {
    return (
      <div style={{ ...containerStyle(IS_LOCAL), ...style }}>
        <span style={{ color: IS_LOCAL ? '#888' : '#666', fontSize: 12 }}>⛽ Loading gas...</span>
      </div>
    );
  }

  // Simple view for local network
  if (IS_LOCAL || !gasPrices) {
    return (
      <div style={{ ...containerStyle(IS_LOCAL), ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⛽</span>
          <span style={{ fontSize: 12, color: IS_LOCAL ? '#888' : '#666' }}>Gas Price</span>
          <span style={{ 
            fontWeight: 600, 
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            color: simpleGas ? getCongestionColor(parseFloat(simpleGas) < 20 ? 'low' : parseFloat(simpleGas) < 50 ? 'medium' : 'high') : '#888'
          }}>
            {simpleGas ? `${simpleGas} Gwei` : '—'}
          </span>
        </div>
      </div>
    );
  }

  // Detailed view for mainnet with full gas data
  if (!showDetails) {
    return (
      <div style={{ ...containerStyle(IS_LOCAL), ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⛽</span>
          <span style={{ fontSize: 12, color: '#888' }}>Gas</span>
          <span style={{ 
            fontWeight: 600, 
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            color: getCongestionColor(formattedGas.congestion)
          }}>
            {formattedGas.gasPrice} Gwei
          </span>
          <span style={{ 
            fontSize: 10, 
            padding: '2px 6px', 
            borderRadius: 4,
            background: `${getCongestionColor(formattedGas.congestion)}20`,
            color: getCongestionColor(formattedGas.congestion)
          }}>
            {formattedGas.estimatedTime}
          </span>
        </div>
      </div>
    );
  }

  // Full detailed view
  return (
    <div style={{ ...detailedContainerStyle(IS_LOCAL), ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>⛽ Gas Prices</span>
        <span style={{ 
          fontSize: 11, 
          padding: '3px 8px', 
          borderRadius: 6,
          background: `${getCongestionColor(formattedGas.congestion)}15`,
          color: getCongestionColor(formattedGas.congestion),
          fontWeight: 500
        }}>
          {formattedGas.congestion === 'low' ? '🟢 Low Traffic' : 
           formattedGas.congestion === 'medium' ? '🟡 Normal' : '🔴 Congested'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['low', 'medium', 'high'] as const).map((speed) => {
          const tier = formatGasPrice(gasPrices, speed);
          const isSelected = selectedSpeed === speed;
          return (
            <button
              key={speed}
              onClick={() => setSelectedSpeed(speed)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: isSelected 
                  ? `2px solid ${getCongestionColor(tier.congestion)}` 
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                background: isSelected 
                  ? `${getCongestionColor(tier.congestion)}15` 
                  : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'capitalize' }}>
                {speed === 'low' ? '🐢 Slow' : speed === 'medium' ? '🚗 Normal' : '🚀 Fast'}
              </div>
              <div style={{ 
                fontWeight: 700, 
                fontSize: 16, 
                fontFamily: 'ui-monospace, monospace',
                color: isSelected ? getCongestionColor(tier.congestion) : '#e0e0e0'
              }}>
                {tier.gasPrice}
              </div>
              <div style={{ fontSize: 10, color: '#888' }}>Gwei</div>
              <div style={{ fontSize: 10, color: '#667eea', marginTop: 4 }}>
                {tier.estimatedTime}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ 
        marginTop: 12, 
        padding: '8px 12px', 
        background: 'rgba(102, 126, 234, 0.1)', 
        borderRadius: 8,
        fontSize: 11,
        color: '#888'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>Base Fee</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>
            {parseFloat(gasPrices.estimatedBaseFee).toFixed(2)} Gwei
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Priority Fee</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>
            {formattedGas.maxPriorityFeePerGas} Gwei
          </span>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#666', textAlign: 'center' }}>
        Data from <a href="https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/" target="_blank" rel="noreferrer" style={{ color: '#667eea' }}>Infura Gas API</a>
      </div>
    </div>
  );
}

function containerStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 8,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
  };
}

function detailedContainerStyle(isDark: boolean): React.CSSProperties {
  return {
    padding: 16,
    borderRadius: 12,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
  };
}

export default GasIndicator;
