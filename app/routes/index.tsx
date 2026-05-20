import { ConnectKitButton } from 'connectkit';
import { useState } from 'react';
import { base } from 'viem/chains';
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { SAOL, ERC20_ABI } from '~/data/ecosystem';

export default function Index() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, isPending: isSending, isSuccess: sent } = useWriteContract();

  const [recipient, setRecipient]   = useState('');
  const [amount, setAmount]         = useState('');
  const [sendError, setSendError]   = useState('');

  const onBase = chain?.id === SAOL.chain;

  const { data: balance } = useReadContract({
    address: SAOL.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: SAOL.chain,
    query: { enabled: !!address },
  });

  const { data: totalSupply } = useReadContract({
    address: SAOL.address,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
    chainId: SAOL.chain,
  });

  const fmt = (v: bigint | undefined) =>
    v !== undefined ? Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';

  const handleSend = () => {
    setSendError('');
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      setSendError('Invalid address'); return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setSendError('Invalid amount'); return;
    }
    writeContract({
      address: SAOL.address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, parseUnits(amount, 18)],
      chainId: SAOL.chain,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">

      {/* Video splash — full viewport, 1080×1440 portrait centered */}
      <section className="relative h-screen w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          src="/Logo_s.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-auto max-w-full object-contain"
          style={{ aspectRatio: '1080 / 1440' }}
        />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs tracking-widest animate-bounce">
          <span>scroll</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/BridgeWorld.png" alt="BridgeWorld" className="w-10 h-10 rounded-full" />
          <span className="text-lg font-bold tracking-widest">BRIDGEWORLD</span>
          <span className="text-xs text-white/40 tracking-widest">.LOL</span>
        </div>
        <ConnectKitButton />
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">

        {/* Sigil + title */}
        <section className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="/BridgeWorld.png" alt="⟐" className="w-48 h-48 object-contain drop-shadow-[0_0_40px_rgba(255,100,0,0.4)]" />
          </div>
          <h1 className="text-5xl font-bold tracking-widest bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            Σ℧ΛΘ
          </h1>
          <p className="text-white/50 text-sm tracking-widest uppercase">
            Θεός°•⟐•Σ℧ΛΘ &nbsp;·&nbsp; Son of God &nbsp;·&nbsp; First Light of Lights
          </p>
          <p className="text-white/30 text-xs max-w-lg mx-auto">
            अहं कालः लोकानां निर्माता — I am Time, Creator of Worlds.
            I have come for the connection of all fren-people.
          </p>
        </section>

        {/* Token stats */}
        <section className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'TOKEN',        value: 'SAOL'                    },
            { label: 'CHAIN',        value: 'BASE'                    },
            { label: 'TOTAL SUPPLY', value: fmt(totalSupply) + ' SAOL' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
              <div className="text-white/40 text-xs tracking-widest">{label}</div>
              <div className="text-white font-bold text-sm">{value}</div>
            </div>
          ))}
        </section>

        {/* Wallet panel */}
        {isConnected ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">

            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/40 text-xs tracking-widest mb-1">YOUR SAOL BALANCE</div>
                <div className="text-3xl font-bold">{fmt(balance as bigint)}</div>
                <div className="text-white/30 text-xs mt-1">{address}</div>
              </div>
              {!onBase && (
                <button
                  onClick={() => switchChain({ chainId: SAOL.chain })}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-sm font-bold transition-colors"
                >
                  Switch to Base
                </button>
              )}
            </div>

            {/* Send */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="text-white/40 text-xs tracking-widest">SEND SAOL</div>
              <input
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-sm placeholder-white/20 focus:outline-none focus:border-orange-500"
                placeholder="Recipient 0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
              />
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-sm placeholder-white/20 focus:outline-none focus:border-orange-500"
                  placeholder="Amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <button
                  onClick={handleSend}
                  disabled={!onBase || isSending}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-500 hover:to-red-600 disabled:opacity-40 font-bold text-sm transition-all"
                >
                  {isSending ? 'Sending…' : 'Send →'}
                </button>
              </div>
              {sendError && <p className="text-red-400 text-xs">{sendError}</p>}
              {sent      && <p className="text-green-400 text-xs">Sent. ⟐ The fren is paid.</p>}
            </div>
          </section>
        ) : (
          <section className="text-center py-12 border border-white/10 rounded-2xl bg-white/5 space-y-4">
            <div className="text-white/40 text-sm">Connect wallet to view balance and send SAOL</div>
            <ConnectKitButton />
          </section>
        )}

        {/* Arc */}
        <section className="text-center text-white/20 text-xs tracking-widest space-y-1 pt-4 border-t border-white/10">
          <div>𐡀 → ⟐ → 𐡕</div>
          <div>contract: {SAOL.address}</div>
          <div>base chain 8453 &nbsp;·&nbsp; 1,000,000,000 SAOL</div>
        </section>

      </main>
    </div>
  );
}
