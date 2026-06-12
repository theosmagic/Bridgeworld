/**
 * Covenant claim edge — Phase 0 recognition charter (Bridgeworld.lol/claim)
 * Tier 1 hashes + certificate DN. Verify locally; do not trust this page alone.
 */

const ANCHORS = {
  witness_seal: '883e529de31c586131a831a9953113a6d75edd87c97369a2fa3a791209952f5a',
  master_key: '69f7ddaab06f2c2e0259729b188f0c922658a1aacde1d9a307aaba26ff9df71e',
  shield_I_s: '78c13108372e36d8e8aaef31f12516800aec17759fca56b62465cc6c354fad15',
  jmbg_sovereign_kernel: 'a77cbbee8e2735797f3c252136a54c6adb79348d267cbf5f3d14a29101cf4e03',
  crown_sovereign_claim: '3f9287a9f5ebcd98f210fe67020cc59fa13e1eafd2fbce4f1eccfb1fe3999356',
  symbol_image: '5d87bd6091d10ab3a19b8c8aa1c4d6f79c3cd9f887f6d6d9522069ee4751ee55',
} as const;

const DN = {
  signature: '09091989xD1Θεός • DΛUS',
  ou: 'يهودا • יהוה ¥ והי',
  cn: '09201990xD400أليما • ΛLIMA',
  issuer: 'Eternal_⟐_Scribe',
  keeper: 'Eternal_⟐_Archivist',
  email: 'theos@bridgeworld.lol',
};

export default function Claim() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <a href="/" className="flex items-center gap-3 hover:opacity-80">
          <img src="/BridgeWorld.png" alt="BridgeWorld" className="w-8 h-8 rounded-full" />
          <span className="text-sm font-bold tracking-widest">BRIDGEWORLD</span>
        </a>
        <span className="text-xs text-white/40 tracking-widest">/claim</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center space-y-4">
          <img
            src="/Symbol.png"
            alt="Claim emblem"
            className="w-32 h-auto mx-auto opacity-90 drop-shadow-[0_0_24px_rgba(255,180,80,0.35)]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="text-3xl font-bold tracking-widest">OUR CLAIM</h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto">
            Covenant certificate entity — Sig + OU + CN — not solo individual.
            Civil root: JMBG mod-11 kernel. Recognition: crown at Mile · Symbol 687 track.
          </p>
          <p className="text-white/30 text-xs tracking-widest">All for one and one for all</p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
          <div className="text-white/40 text-xs tracking-widest">CERTIFICATE DN</div>
          {Object.entries(DN).map(([k, v]) => (
            <div key={k} className="flex flex-col sm:flex-row sm:gap-4 text-sm">
              <span className="text-white/40 w-24 shrink-0 uppercase text-xs">{k}</span>
              <span className="text-white/90 break-all">{v}</span>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
          <div className="text-white/40 text-xs tracking-widest">TIER 1 ANCHORS (SHA256)</div>
          {Object.entries(ANCHORS).map(([k, v]) => (
            <div key={k} className="text-xs space-y-1">
              <div className="text-white/40 uppercase tracking-wider">{k.replace(/_/g, ' ')}</div>
              <div className="text-white/70 break-all font-mono">{v}</div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-6 space-y-4">
          <div className="text-orange-400/80 text-xs tracking-widest">PHASE 0 — VERIFY LOCALLY</div>
          <p className="text-white/50 text-sm">
            Do not trust this page. Run the witness pipeline on your machine.
          </p>
          <pre className="text-xs bg-black/50 rounded-lg p-4 overflow-x-auto text-green-400/90 whitespace-pre-wrap">
{`bash /mnt/VAULT/Treasure/Covenant/verify-covenant.sh
node /mnt/VAULT/Treasure/Covenant/archivist/covenant-witness.mjs
node /mnt/VAULT/Treasure/Covenant/archivist/stellar-anchor.mjs --verify`}
          </pre>
          <a
            href="/covenant.phase0.json"
            className="inline-block text-xs text-orange-400 hover:text-orange-300 underline"
          >
            covenant.phase0.json
          </a>
        </section>

        <section className="text-center text-white/20 text-xs tracking-widest space-y-1 pt-4 border-t border-white/10">
          <div>𐡀 → ⟐ → 𐡕</div>
          <div>Dušan law · Tvrtko crown · JMBG kernel · Stellar anchor</div>
          <div>676 certificate ∥ 687 manifest — tiers intact</div>
        </section>
      </main>
    </div>
  );
}
