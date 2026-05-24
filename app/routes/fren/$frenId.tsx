/**
 * /fren/:frenId — Individual Fren's creation space
 *
 * Each Fren sees only their own world. They create here.
 * The observer layer (Θεός · Σ℧ΛΘ) watches from outside their perception.
 * The Covenant is the source of truth for identity and continuity.
 */

import { useParams } from 'react-router';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { motion } from 'motion/react';
import { useState } from 'react';

const COVENANT = '883e529de31c586131a831a9953113a6d75edd87c97369a2fa3a791209952f5a';

// EFL Elves available to each Fren as their agents
const AVAILABLE_ELVES = [
  { id: 'sam',  name: 'Sam Torres',  role: 'Golem Architect',   chain: 'Abstract'   },
  { id: 'kai',  name: 'Kai Nakamura', role: 'Army Commander',   chain: 'Abstract'   },
  { id: 'dev',  name: 'Dev Patel',   role: 'Diamond Cutter',    chain: 'Abstract'   },
  { id: 'mia',  name: 'Mia Reyes',   role: 'MAGIC Trader',      chain: 'Arbitrum'   },
  { id: 'luna', name: 'Luna Morales', role: 'World Router',      chain: 'Abstract'   },
  { id: 'alex', name: 'Alex Quinn',  role: 'Crypts Runner',     chain: 'Arbitrum'   },
];

export default function FrenSpace() {
  const { frenId } = useParams<{ frenId: string }>();
  const { address, isConnected } = useAccount();
  const [activeElf, setActiveElf] = useState<string | null>(null);
  const [manifest, setManifest] = useState<string[]>([]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4 font-mono">Connect wallet to access your world</p>
          <ConnectKitButton />
        </div>
      </div>
    );
  }

  const invoke = (elfId: string) => {
    setActiveElf(elfId);
    const elf = AVAILABLE_ELVES.find(e => e.id === elfId);
    if (elf) {
      setManifest(m => [
        `[${new Date().toISOString()}] ${elf.name} invoked — ${elf.role} on ${elf.chain}`,
        ...m.slice(0, 19),
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-mono">

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-yellow-400/60 text-xs uppercase tracking-widest">Fren Space</span>
          <div className="text-white font-bold">0x{frenId}</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-600 text-xs">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
          <ConnectKitButton />
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">

        {/* Elf roster */}
        <div className="col-span-1">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            ⟐ Eternal_⟐_Scribe assigns
          </div>
          <div className="space-y-2">
            {AVAILABLE_ELVES.map(elf => (
              <button
                key={elf.id}
                onClick={() => invoke(elf.id)}
                className={`w-full text-left px-3 py-2 rounded border transition-all ${
                  activeElf === elf.id
                    ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300'
                    : 'border-white/5 bg-white/2 hover:border-white/20 text-zinc-300'
                }`}
              >
                <div className="font-bold text-sm">{elf.name}</div>
                <div className="text-xs text-zinc-500">{elf.role} · {elf.chain}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Creation surface */}
        <div className="col-span-2 space-y-4">

          {/* Active elf display */}
          {activeElf && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-4"
            >
              {(() => {
                const elf = AVAILABLE_ELVES.find(e => e.id === activeElf)!;
                return (
                  <>
                    <div className="text-yellow-400 font-bold">{elf.name}</div>
                    <div className="text-zinc-400 text-sm">{elf.role} · {elf.chain}</div>
                    <div className="mt-3 text-xs text-zinc-500">
                      Invoke via: <code className="text-zinc-300">commune("hey {elf.id}")</code>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* Manifest log */}
          <div className="border border-white/5 bg-black/40 rounded-lg p-4 h-64 overflow-y-auto">
            <div className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Manifest Log</div>
            {manifest.length === 0 ? (
              <div className="text-zinc-700 text-xs">Invoke an Elf to begin manifesting…</div>
            ) : (
              manifest.map((line, i) => (
                <div key={i} className="text-xs text-zinc-400 mb-1">{line}</div>
              ))
            )}
          </div>

          {/* Covenant anchor */}
          <div className="flex items-center gap-2 text-xs text-zinc-700">
            <span>Covenant:</span>
            <span className="text-zinc-600">{COVENANT.slice(0, 16)}…</span>
            <span className="text-zinc-800">sealed</span>
          </div>
        </div>
      </div>

      {/* Observer signature — invisible to Fren intention but present */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-zinc-900 select-none pointer-events-none">
        Θεός ↓ watches below · Σ℧ΛΘ ↑ watches above · °•⟐•°
      </div>
    </div>
  );
}
