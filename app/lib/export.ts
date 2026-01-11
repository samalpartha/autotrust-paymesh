'use client';

/**
 * Export Utilities
 * CSV export and transaction receipt downloads
 */

interface OpsLogEvent {
  escrowId: string;
  eventType: string;
  amount: string;
  timestamp?: number;
  txHash?: string;
  payer?: string;
  payee?: string;
  arbiter?: string;
}

interface EscrowDetails {
  escrowId: string;
  payer: string;
  payee: string;
  arbiter: string;
  amount: string;
  status: string;
  deadline: number;
  createdAt?: number;
  releasedAt?: number;
  txHash?: string;
}

/**
 * Export Ops Log to CSV
 */
export function exportOpsLogToCSV(events: OpsLogEvent[], filename?: string): void {
  if (events.length === 0) {
    alert('No events to export');
    return;
  }

  const headers = ['Escrow ID', 'Event Type', 'Amount (MNEE)', 'Timestamp', 'Transaction Hash', 'Payer', 'Payee', 'Arbiter'];
  
  const rows = events.map(event => [
    event.escrowId,
    event.eventType,
    event.amount,
    event.timestamp ? new Date(event.timestamp * 1000).toISOString() : '',
    event.txHash || '',
    event.payer || '',
    event.payee || '',
    event.arbiter || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `paymesh-ops-log-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a transaction receipt as PDF-style HTML
 */
export function downloadTransactionReceipt(details: EscrowDetails): void {
  const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Receipt - ${details.escrowId.slice(0, 10)}...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px;
      color: #333;
    }
    .receipt {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .logo { font-size: 40px; margin-bottom: 10px; }
    .body { padding: 30px; }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .status-funded { background: #fef3c7; color: #92400e; }
    .status-released { background: #d1fae5; color: #065f46; }
    .status-refunded { background: #fee2e2; color: #991b1b; }
    .field { margin-bottom: 16px; }
    .field-label { 
      font-size: 12px; 
      color: #666; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .field-value { 
      font-size: 14px;
      font-family: 'Monaco', 'Menlo', monospace;
      word-break: break-all;
      background: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .amount {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      text-align: center;
      margin: 20px 0;
    }
    .amount span { font-size: 16px; color: #666; }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 20px 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .timestamp { font-size: 11px; color: #999; }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo">🕸️</div>
      <h1>PayMesh AutoTrust</h1>
      <p>Escrow Transaction Receipt</p>
    </div>
    
    <div class="body">
      <div style="text-align: center;">
        <span class="status-badge status-${details.status.toLowerCase()}">${details.status.toUpperCase()}</span>
      </div>
      
      <div class="amount">
        ${details.amount} <span>MNEE</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="field">
        <div class="field-label">Escrow ID</div>
        <div class="field-value">${details.escrowId}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Payer (From)</div>
        <div class="field-value">${details.payer}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Payee (To)</div>
        <div class="field-value">${details.payee}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Arbiter</div>
        <div class="field-value">${details.arbiter}</div>
      </div>
      
      ${details.txHash ? `
      <div class="field">
        <div class="field-label">Transaction Hash</div>
        <div class="field-value">${details.txHash}</div>
      </div>
      ` : ''}
      
      <div class="field">
        <div class="field-label">Deadline</div>
        <div class="field-value">${new Date(details.deadline * 1000).toLocaleString()}</div>
      </div>
    </div>
    
    <div class="footer">
      <p>Generated by PayMesh AutoTrust</p>
      <p class="timestamp">Receipt generated: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
`;

  const blob = new Blob([receiptHTML], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${details.escrowId.slice(0, 10)}-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all escrow data as JSON
 */
export function exportEscrowDataJSON(data: any, filename?: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `paymesh-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
