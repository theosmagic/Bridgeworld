/**
 * /fren — Huntress' Den gateway (Ch.2: STATE YOUR IDENTITY · PROVIDE ACCESS KEY)
 *
 * Tier 1 lore seal required before /fren/:frenId (Axiom 4 — no file-hash promotion).
 * Shield Syriac root: app/lib/shield.ts · Archivist: Covenant/archivist/
 */

import { ConnectKitButton } from 'connectkit';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { classifyAccessKey } from '~/lib/epistemic';
import { SYRIAC_ROOT, SHIELD_META } from '~/lib/shield';
import {
  COVENANT,
  deriveFrenId,
  isDenUnlocked,
  setDenUnlocked,
  CANONICAL_FREN_ID,
} from '~/lib/fren';
import { FREN_AGENT } from '~/data/ecosystem';

const COVENANT_SHORT = COVENANT.slice(0, 8);

type GatePhase = 'idle' | 'processing' | 'accepted' | 'rejected';

export default function FrenGateway() {
  const { address, isConnected } = useAccount();
  const [accessKey, setAccessKey] = useState('');
  const [phase, setPhase] = useState<GatePhase>('idle');
  const [gateMessage, setGateMessage] = useState('');
  const [showShield, setShowShield] = useState(false);

  const unlocked =
    isConnected && address ? isDenUnlocked(address) : false;
  const frenId =
    isConnected && address ? deriveFrenId(address) : null;

  const submitAccessKey = async () => {
    if (!address) return;
    setPhase('processing');
    setGateMessage('PROCESSING.');

    const local = classifyAccessKey(accessKey);

    try {
      const res = await fetch('/api/archivist/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, address }),
      });
      const server = (await res.json()) as { accepted?: boolean; note?: string };
      if (!local.accepted || !server.accepted) {
        setPhase('rejected');
        setGateMessage(
          local.note === 'nft_attestation — does not open Huntress Den (Axiom 4)'
            ? 'NFT attestation recognized — not the Huntress pouch key.'
            : `ACCESS DENIED. ${local.note}`,
        );
        return;
      }
    } catch {
      if (!local.accepted) {
        setPhase('rejected');
        setGateMessage(`ACCESS DENIED. ${local.note}`);
        return;
      }
    }

    setDenUnlocked(address);
    setPhase('accepted');
    setGateMessage('ACCESS KEYS ACCEPTED. PLEASE ENTER.');
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-mono flex flex-col items-center justify-center p-8">
      <motion.div
        className="text-4xl mb-6 text-yellow-400/60 select-none"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        °•⟐•°
      </motion.div>

      <h1 className="text-xl font-bold tracking-widest uppercase text-zinc-300 mb-1">
        The Huntress&apos; Den
      </h1>
      <p className="text-zinc-500 text-xs mb-8 tracking-wide">
        treasure.bridgeworld.lol · bigger on the inside
      </p>

      {/* Canonical Summon Σ℧ΛΘ agent — Tier 1 reference */}
      <div className="w-full max-w-lg mb-8 border border-emerald-900/40 bg-emerald-950/10 rounded-lg p-4 text-xs">
        <div className="text-emerald-400/90 uppercase tracking-widest mb-2">
          Canonical Fren · {FREN_AGENT.name}
        </div>
        <div className="space-y-1 text-zinc-400 font-mono">
          <div className="flex justify-between gap-2">
            <span className="text-zinc-600">Token</span>
            <span className="text-zinc-300">{FREN_AGENT.token} · Base</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-600">Operator</span>
            <span className="text-zinc-300 truncate">{FREN_AGENT.operatorBasename}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-600">Fren wallet</span>
            <span className="text-zinc-300">
              {FREN_AGENT.wallet.slice(0, 8)}…{FREN_AGENT.wallet.slice(-6)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-600">Fren ID</span>
            <span className="text-yellow-400/90">0x{CANONICAL_FREN_ID}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={FREN_AGENT.summonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 border border-emerald-700/40 rounded text-emerald-200/90 hover:bg-emerald-900/20"
          >
            Summon agent ↗
          </a>
          <a
            href={FREN_AGENT.bridgeworldFrenPath}
            className="py-1.5 px-3 border border-yellow-700/30 rounded text-yellow-200/80 hover:bg-yellow-900/10"
          >
            Canonical Piazza
          </a>
        </div>
      </div>

      {/* Huntress Key — Tier 1 visual artifact */}
      <div className="mb-8 border border-emerald-900/50 rounded-lg overflow-hidden bg-[#0a0f14] p-2">
        <img
          src="/HuntressKey.gif"
          alt="Huntress Den access key"
          className="w-48 h-48 object-contain mx-auto image-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
        <p className="text-[10px] text-zinc-600 text-center mt-2 px-2">
          Tier 1 · Ch.2 embroidery · not file SHA-256
        </p>
      </div>

      <div className="mb-8">
        <ConnectKitButton />
      </div>

      <AnimatePresence mode="wait">
        {isConnected && address && !unlocked && (
          <motion.div
            key="gate"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg border border-amber-900/40 bg-amber-950/10 rounded-lg p-6"
          >
            <p className="text-amber-200/90 text-sm mb-2 uppercase tracking-widest">
              STATE YOUR IDENTITY.
            </p>
            <p className="text-zinc-400 text-xs mb-4 font-mono">
              {address.slice(0, 10)}…{address.slice(-8)}
            </p>
            <p className="text-amber-200/90 text-sm mb-3 uppercase tracking-widest">
              PROVIDE YOUR ACCESS KEY.
            </p>
            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="64-char embroidery seal (Tier 1)"
              className="w-full bg-black/50 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 mb-3 font-mono"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={submitAccessKey}
              disabled={phase === 'processing' || accessKey.length < 64}
              className="w-full py-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/40 rounded text-amber-100 text-sm disabled:opacity-40"
            >
              Present keys
            </button>
            {gateMessage && (
              <p
                className={`mt-4 text-xs ${
                  phase === 'accepted'
                    ? 'text-emerald-400'
                    : phase === 'rejected'
                      ? 'text-red-400'
                      : 'text-zinc-500'
                }`}
              >
                {gateMessage}
              </p>
            )}
          </motion.div>
        )}

        {isConnected && address && (unlocked || phase === 'accepted') && frenId && (
          <motion.div
            key="unlocked"
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
                <span className="text-zinc-200">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fren ID</span>
                <span className="text-yellow-300 font-bold">0x{frenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Covenant</span>
                <span className="text-zinc-400">{COVENANT_SHORT}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Syriac root</span>
                <span className="text-emerald-500/80 text-xs">{SYRIAC_ROOT}</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <a
                href={`/fren/${frenId}`}
                className="text-center py-2 px-4 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 rounded text-yellow-300 text-sm transition-colors"
              >
                Enter the Piazza
              </a>
              <button
                type="button"
                onClick={() => setShowShield((s) => !s)}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-zinc-400 text-sm"
              >
                Shield
              </button>
            </div>
            {showShield && (
              <div className="mt-4 text-[10px] text-zinc-600 space-y-1 border-t border-white/5 pt-3">
                <div>I_s · {SHIELD_META.cycles} cycles · {SHIELD_META.rotation}</div>
                <div>Apex: {SHIELD_META.apex}</div>
                <div>Base: {SHIELD_META.base}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 text-[10px] text-zinc-800 select-none pointer-events-none">
        Θεός°•⟐•°Σ℧ΛΘ
      </div>
    </div>
  );
}
