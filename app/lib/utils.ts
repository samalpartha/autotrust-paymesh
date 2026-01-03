export function shortAddr(addr?: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function toBytes32FromString(s: string) {
  // client-side helper: stable ID generation for demo.
  // In production, escrowId should be server-generated and collision-resistant.
  const encoder = new TextEncoder();
  const bytes = encoder.encode(s);
  // keccak in-browser requires viem; we use it directly where needed.
  return bytes;
}
