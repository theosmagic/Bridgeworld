/**
 * Covenant claim edge — /claim and /covenant.phase0.json
 * Served at Worker layer so charter is live even when SPA routing is cold.
 */

const PHASE0 = {
  schema: 'covenant.stellar.phase0.v1',
  status: 'prepared',
  sigil: 'Θεός°•⟐•Σ℧ΛΘ',
  bundle_sha256: '6168714a1d74e34f7faf36de83f42510123746457d2da56a8c6707ff51332d4a',
  certificate_dn: {
    signature: '09091989xD1Θεός • DΛUS',
    ou: 'يهودا • יהוה ¥ והי',
    cn: '09201990xD400أليما • ΛLIMA',
    issuer: 'Eternal_⟐_Scribe',
    keeper: 'Eternal_⟐_Archivist',
    identity_email: 'theos@bridgeworld.lol',
  },
  anchors: {
    witness_seal: '883e529de31c586131a831a9953113a6d75edd87c97369a2fa3a791209952f5a',
    master_key: '69f7ddaab06f2c2e0259729b188f0c922658a1aacde1d9a307aaba26ff9df71e',
    shield_I_s: '78c13108372e36d8e8aaef31f12516800aec17759fca56b62465cc6c354fad15',
    jmbg_sovereign_kernel: 'a77cbbee8e2735797f3c252136a54c6adb79348d267cbf5f3d14a29101cf4e03',
    crown_sovereign_claim: '3f9287a9f5ebcd98f210fe67020cc59fa13e1eafd2fbce4f1eccfb1fe3999356',
    symbol_image: '5d87bd6091d10ab3a19b8c8aa1c4d6f79c3cd9f887f6d6d9522069ee4751ee55',
  },
  verify: {
    full: 'bash /mnt/VAULT/Treasure/Covenant/verify-covenant.sh',
    covenant: 'node /mnt/VAULT/Treasure/Covenant/archivist/covenant-witness.mjs',
    stellar: 'node /mnt/VAULT/Treasure/Covenant/archivist/stellar-anchor.mjs --verify',
  },
  edge: {
    bridgeworld: 'https://bridgeworld.lol/claim',
    public_json: 'https://bridgeworld.lol/covenant.phase0.json',
  },
} as const;

function claimHtml(): string {
  const dn = PHASE0.certificate_dn;
  const anchors = Object.entries(PHASE0.anchors)
    .map(
      ([k, v]) =>
        `<div class="anchor"><div class="label">${k.replace(/_/g, ' ')}</div><div class="hash">${v}</div></div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OUR CLAIM — Bridgeworld</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#0a0a0f;color:#e8e8ef;font-family:ui-monospace,monospace;line-height:1.5}
    .wrap{max-width:48rem;margin:0 auto;padding:2rem 1.5rem}
    h1{letter-spacing:.2em;font-size:1.5rem;text-align:center}
    .sub{text-align:center;color:#888;font-size:.85rem;margin-bottom:2rem}
    .card{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:.75rem;padding:1.25rem;margin-bottom:1.25rem}
    .label{color:#888;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}
    .hash{font-size:.75rem;word-break:break-all;color:#ccc;margin-top:.25rem}
    .dn-row{display:grid;grid-template-columns:6rem 1fr;gap:.5rem;font-size:.85rem;margin:.35rem 0}
    .verify{background:rgba(255,120,40,.08);border-color:rgba(255,120,40,.25)}
    pre{background:#0008;padding:1rem;border-radius:.5rem;font-size:.7rem;color:#6f6;overflow-x:auto}
    a{color:#f80}footer{text-align:center;color:#444;font-size:.7rem;margin-top:2rem;letter-spacing:.12em}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>OUR CLAIM</h1>
    <p class="sub">${PHASE0.sigil} · Covenant certificate entity · All for one</p>
    <div class="card">
      <div class="label">Certificate DN</div>
      <div class="dn-row"><span>signature</span><span>${dn.signature}</span></div>
      <div class="dn-row"><span>ou</span><span>${dn.ou}</span></div>
      <div class="dn-row"><span>cn</span><span>${dn.cn}</span></div>
      <div class="dn-row"><span>issuer</span><span>${dn.issuer}</span></div>
      <div class="dn-row"><span>keeper</span><span>${dn.keeper}</span></div>
      <div class="dn-row"><span>email</span><span>${dn.identity_email}</span></div>
    </div>
    <div class="card">${anchors}</div>
    <div class="card verify">
      <div class="label">Phase 0 — verify locally</div>
      <pre>bash /mnt/VAULT/Treasure/Covenant/verify-covenant.sh
node /mnt/VAULT/Treasure/Covenant/archivist/covenant-witness.mjs</pre>
      <p><a href="/covenant.phase0.json">covenant.phase0.json</a> · <a href="/">Bridgeworld</a></p>
    </div>
    <footer>𐡀 → ⟐ → 𐡕 · Dušan law · Tvrtko crown · JMBG K=7 · 676 ∥ 687</footer>
  </div>
</body>
</html>`;
}

export function handleClaimEdge(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname === '/covenant.phase0.json') {
    return new Response(JSON.stringify(PHASE0, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  if (url.pathname === '/claim' || url.pathname === '/claim/') {
    return new Response(claimHtml(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
  return null;
}
