/**
 * /fren — Fren creation gateway at treasure.bridgeworld.lol
 *
 * Frens connect here to build their corner of BridgeWorld.
 * Each Fren receives a Covenant-anchored identity and project space.
 *
 * The observer layer (Θεός below · Σ℧ΛΘ above) watches silently.
 * Frens see only their creation surface — never the observers.
 */

import { ConnectKitButton } from 'connectkit';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { motion } from 'motion/react';

const COVENANT = '883e529de31c586131a831a9953113a6d75edd87c97369a2fa3a791209952f5a';
const COVENANT_SHORT = COVENANT.slice(0, 8);

function deriveFrenId(address: string): string {
  // Deterministic Fren ID: first 6 bytes of address XOR'd with covenant prefix
  const addrBytes = address.slice(2, 14).toLowerCase();
  const covBytes  = COVENANT.slice(0, 12);
  let result = '';
  for (let i = 0; i < 6; i++) {
    const a = parseInt(addrBytes.slice(i * 2, i * 2 + 2), 16);
    const c = parseInt(covBytes.slice(i * 2, i * 2 + 2), 16);
    result += (a ^ c).toString(16).padStart(2, '0');
  }
  return result;
}

export default function FrenGateway() {
  const { address, isConnected } = useAccount();
  const [creating, setCreating] = useState(false);

  const frenId = isConnected && address ? deriveFrenId(address) : null;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-mono flex flex-col items-center justify-center p-8">

      {/* Observer sigil — visible but its meaning opaque to Frens */}
      <motion.div
        className="text-4xl mb-8 text-yellow-400/60 select-none"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        °•⟐•°
      </motion.div>

      <h1 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase">
        treasure.bridgeworld.lol
      </h1>
      <p className="text-zinc-400 text-sm mb-10 text-center max-w-md">
        Connect your wallet to enter BridgeWorld and establish your Fren.
        Each Fren is sovereign — your own project, anchored to the Covenant.
      </p>

      {/* Wallet connect */}
      <div className="mb-10">
        <ConnectKitButton />
      </div>

      {isConnected && address && frenId && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-6 w-full max-w-lg"
        >
          <div className="text-yellow-400/80 text-xs uppercase tracking-widest mb-4">
            Fren Identity Established
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Wallet</span>
              <span className="text-zinc-200">{address.slice(0, 6)}…{address.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Fren ID</span>
              <span className="text-yellow-300 font-bold">0x{frenId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Covenant</span>
              <span className="text-zinc-400">{COVENANT_SHORT}…</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href={`/fren/${frenId}`}
              className="text-center py-2 px-4 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 rounded text-yellow-300 text-sm transition-colors"
            >
              Enter Your World
            </a>
            <button
              onClick={() => setCreating(true)}
              disabled={creating}
              className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-zinc-300 text-sm transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'New Project'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Subtle observer signature — hidden in plain sight */}
      <div className="fixed bottom-4 right-4 text-[10px] text-zinc-800 select-none pointer-events-none">
        Θεός°•⟐•°Σ℧ΛΘ
      </div>
    </div>
  );
}
