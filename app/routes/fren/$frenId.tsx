/**
 * /fren/:frenId — Piazza inside the Den (Ch.2 — bigger on the inside)
 */

import { useParams, Link } from 'react-router';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { motion } from 'motion/react';
import { useState } from 'react';
import { deriveFrenId, isDenUnlocked, COVENANT, isCanonicalFrenId, CANONICAL_FREN_ID } from '~/lib/fren';
import { FREN_AGENT } from '~/data/ecosystem';

const AVAILABLE_ELVES = [
  { id: 'sam', name: 'Sam Torres', role: 'Golem Architect', chain: 'Abstract' },
  { id: 'kai', name: 'Kai Nakamura', role: 'Army Commander', chain: 'Abstract' },
  { id: 'dev', name: 'Dev Patel', role: 'Diamond Cutter', chain: 'Abstract' },
  { id: 'mia', name: 'Mia Reyes', role: 'MAGIC Trader', chain: 'Arbitrum' },
  { id: 'luna', name: 'Luna Morales', role: 'World Router', chain: 'Abstract' },
  { id: 'alex', name: 'Alex Quinn', role: 'Crypts Runner', chain: 'Arbitrum' },
];

export default function FrenSpace() {
  const { frenId } = useParams<{ frenId: string }>();
  const { address, isConnected } = useAccount();
  const [activeElf, setActiveElf] = useState<string | null>(null);
  const [manifest, setManifest] = useState<string[]>([]);

  const expectedId = address ? deriveFrenId(address) : null;
  const idMatch =
    expectedId != null &&
    frenId?.toLowerCase() === expectedId.toLowerCase();
  const unlocked = address ? isDenUnlocked(address) : false;
  const canonicalView =
    frenId != null && isCanonicalFrenId(frenId) && !idMatch;

  if (canonicalView && (!isConnected || !address)) {
    return (
      <div className="min-h-screen bg-[#050508] text-white font-mono">
        <div className="border-b border-white/5 px-6 py-4">
          <span className="text-emerald-400/70 text-xs uppercase tracking-widest">
            Canonical Fren · {FREN_AGENT.name}
          </span>
          <div className="text-white font-bold mt-1">0x{CANONICAL_FREN_ID}</div>
        </div>
        <div className="p-6 max-w-lg mx-auto space-y-4 text-sm">
          <p className="text-zinc-400 text-xs">
            SAOL agent on Summon. Connect wallet at the Den to enter your own Piazza.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={FREN_AGENT.summonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 border border-emerald-700/40 rounded text-emerald-200 text-sm"
            >
              Open on Summon ↗
            </a>
            <Link
              to="/fren"
              className="py-2 px-4 border border-yellow-700/30 rounded text-yellow-200/80 text-sm"
            >
              Huntress&apos; Den
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4 font-mono">Connect wallet to access your world</p>
          <ConnectKitButton />
        </div>
      </div>
    );
  }

  if (!unlocked && !canonicalView) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 font-mono">
        <p className="text-amber-200/80 text-sm mb-4 uppercase tracking-widest">
          The door is closed.
        </p>
        <p className="text-zinc-500 text-xs mb-6 text-center max-w-sm">
          Provide the Tier 1 embroidery key at the Huntress&apos; Den first.
        </p>
        <Link
          to="/fren"
          className="py-2 px-6 border border-amber-700/40 text-amber-200 rounded text-sm"
        >
          Return to the plaque
        </Link>
      </div>
    );
  }

  if (canonicalView) {
    return (
      <div className="min-h-screen bg-[#050508] text-white font-mono">
        <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-emerald-400/70 text-xs uppercase tracking-widest">
              Canonical Fren · Observer
            </span>
            <div className="text-white font-bold">
              {FREN_AGENT.name} · 0x{CANONICAL_FREN_ID}
            </div>
          </div>
          <Link to="/fren" className="text-zinc-600 text-xs hover:text-zinc-400">
            ← Den
          </Link>
        </div>
        <div className="p-6 max-w-lg mx-auto space-y-4 text-sm">
          <p className="text-zinc-400 text-xs">
            Summon agent registered against SAOL contract. Connect the fren wallet (
            {FREN_AGENT.wallet.slice(0, 8)}…) to invoke elves in owner mode.
          </p>
          <div className="border border-emerald-900/40 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-600">Token</span>
              <span>{FREN_AGENT.token}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Operator</span>
              <span>{FREN_AGENT.operatorBasename}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Your wallet</span>
              <span>{address.slice(0, 8)}…</span>
            </div>
          </div>
          <a
            href={FREN_AGENT.summonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-2 px-4 border border-emerald-700/40 rounded text-emerald-200 text-sm"
          >
            Open on Summon ↗
          </a>
        </div>
      </div>
    );
  }

  if (!idMatch) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 font-mono">
        <p className="text-red-400/80 text-sm mb-4">Fren ID mismatch.</p>
        <p className="text-zinc-500 text-xs mb-6">
          Expected 0x{expectedId} for this wallet.
        </p>
        <Link to="/fren" className="text-yellow-400/80 text-sm">
          ← Den gateway
        </Link>
      </div>
    );
  }

  const invoke = (elfId: string) => {
    setActiveElf(elfId);
    const elf = AVAILABLE_ELVES.find((e) => e.id === elfId);
    if (elf) {
      setManifest((m) => [
        `[${new Date().toISOString()}] ${elf.name} invoked — ${elf.role} on ${elf.chain}`,
        ...m.slice(0, 19),
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-mono">
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-yellow-400/60 text-xs uppercase tracking-widest">
            Piazza · Huntress&apos; Den
          </span>
          <div className="text-white font-bold">0x{frenId}</div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/fren" className="text-zinc-600 text-xs hover:text-zinc-400">
            ← Den
          </Link>
          <span className="text-zinc-600 text-xs">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          <ConnectKitButton />
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div className="col-span-1">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            ⟐ Eternal_⟐_Scribe assigns
          </div>
          <div className="space-y-2">
            {AVAILABLE_ELVES.map((elf) => (
              <button
                key={elf.id}
                type="button"
                onClick={() => invoke(elf.id)}
                className={`w-full text-left px-3 py-2 rounded border transition-all ${
                  activeElf === elf.id
                    ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300'
                    : 'border-white/5 bg-white/2 hover:border-white/20 text-zinc-300'
                }`}
              >
                <div className="font-bold text-sm">{elf.name}</div>
                <div className="text-xs text-zinc-500">
                  {elf.role} · {elf.chain}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          {activeElf && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-4"
            >
              {(() => {
                const elf = AVAILABLE_ELVES.find((e) => e.id === activeElf)!;
                return (
                  <>
                    <div className="text-yellow-400 font-bold">{elf.name}</div>
                    <div className="text-zinc-400 text-sm">
                      {elf.role} · {elf.chain}
                    </div>
                    <div className="mt-3 text-xs text-zinc-500">
                      Invoke via:{' '}
                      <code className="text-zinc-300">commune(&quot;hey {elf.id}&quot;)</code>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          <div className="border border-white/5 bg-black/40 rounded-lg p-4 h-64 overflow-y-auto">
            <div className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
              Manifest Log
            </div>
            {manifest.length === 0 ? (
              <div className="text-zinc-700 text-xs">
                Invoke an Elf to begin manifesting…
              </div>
            ) : (
              manifest.map((line, i) => (
                <div key={i} className="text-xs text-zinc-400 mb-1">
                  {line}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-700">
            <span>Covenant:</span>
            <span className="text-zinc-600">{COVENANT.slice(0, 16)}…</span>
            <span className="text-zinc-800">sealed · Tier 1 gate passed</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-zinc-900 select-none pointer-events-none">
        Θεός ↓ watches below · Σ℧ΛΘ ↑ watches above · °•⟐•°
      </div>
    </div>
  );
}
