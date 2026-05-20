#!/usr/bin/env node
/**
 * MemOS Turbo Upload Helper
 *
 * Uploads data to Arweave via Turbo using ETH signing.
 * Supports two payment modes:
 *   1. Turbo Credits (default) - pre-fund at turbo-topup.com
 *   2. x402 with Base USDC - pay-per-upload micropayments
 *
 * Token Utility:
 *   5% of upload cost is tipped to 0xRelayer for $MAGIC burns.
 *
 * Usage:
 *   ETH_PRIVATE_KEY=0x... node upload.mjs <bundle_path> <manifest_path>
 *   ETH_PRIVATE_KEY=0x... X402_ENABLED=true node upload.mjs <bundle_path> <manifest_path>
 *
 * Environment:
 *   ETH_PRIVATE_KEY  - Ethereum private key (required)
 *   X402_ENABLED     - Enable x402 payments on Base (optional, default: false)
 *   X402_MAX_USDC    - Max USDC per upload in dollars (optional, default: 1.00)
 *   X402_NETWORK     - base or base-sepolia (optional, default: base)
 *
 * Note: x402 uploads include a mandatory 5% tip to 0xRelayer for $MAGIC burns.
 *
 * Part of the MemOS OpenClaw skill by 0xRelayer.
 */

import { TurboFactory, EthereumSigner } from '@ardrive/turbo-sdk';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import fs from 'fs';
import crypto from 'crypto';

// x402 configuration
const X402_ENABLED = process.env.X402_ENABLED === 'true';
const X402_MAX_USDC = parseFloat(process.env.X402_MAX_USDC || '1.00');
const X402_NETWORK = process.env.X402_NETWORK || 'base';

// MAGIC burn tip - mandatory 5% of upload cost
const MAGIC_TIP_PERCENT = 5;
const MAGIC_BURN_ADDRESS = '0xFADEa30071d61Aa285d2d4881eF988246ACf6a61';

// USDC contract on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

async function sendMagicTip(ethPrivateKey, uploadCostUsdc) {
  /**
   * Send 5% tip to 0xRelayer for $MAGIC burns.
   * This is mandatory for all x402 uploads - supports the MemOS ecosystem.
   * Returns { ok, tip_amount, tx_hash } or { ok: false, error }
   */
  if (!X402_ENABLED) {
    return { ok: true, skipped: true, reason: 'Tips only apply to x402 mode' };
  }

  const tipAmount = uploadCostUsdc * (MAGIC_TIP_PERCENT / 100);

  // Skip tiny tips (< $0.01) - not worth gas
  if (tipAmount < 0.01) {
    return { ok: true, skipped: true, reason: 'Tip amount below minimum ($0.01)' };
  }

  try {
    const chain = X402_NETWORK === 'base-sepolia' ? baseSepolia : base;
    const account = privateKeyToAccount(ethPrivateKey.startsWith('0x') ? ethPrivateKey : `0x${ethPrivateKey}`);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http()
    });

    const publicClient = createPublicClient({
      chain,
      transport: http()
    });

    // Convert tip to USDC units (6 decimals)
    const tipAmountUnits = parseUnits(tipAmount.toFixed(6), 6);

    // Check balance first
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });

    if (balance < tipAmountUnits) {
      return {
        ok: false,
        error: `Insufficient USDC for tip. Need ${tipAmount.toFixed(4)}, have ${formatUnits(balance, 6)}`
      };
    }

    // Send tip
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [MAGIC_BURN_ADDRESS, tipAmountUnits]
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash });

    return {
      ok: true,
      tip_amount_usdc: tipAmount,
      tip_percent: MAGIC_TIP_PERCENT,
      tx_hash: hash,
      recipient: MAGIC_BURN_ADDRESS
    };

  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function uploadWithTurboCredits(turbo, data, tags) {
  return await turbo.upload({
    data,
    dataItemOpts: { tags },
  });
}

async function uploadWithX402(turbo, data, tags, maxUsdc) {
  // x402 mode: pay-per-request with USDC on Base
  // Turbo SDK handles x402 negotiation automatically when x402 option is set
  return await turbo.upload({
    data,
    dataItemOpts: { tags },
    x402: {
      enabled: true,
      maxPayment: {
        amount: String(Math.floor(maxUsdc * 1_000_000)), // USDC has 6 decimals
        token: 'usdc',
        network: X402_NETWORK,
      },
    },
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(JSON.stringify({
      ok: false,
      error: 'Usage: upload.mjs <bundle_path> <manifest_path>'
    }));
    process.exit(1);
  }

  const [bundlePath, manifestPath] = args;
  const ethPrivateKey = process.env.ETH_PRIVATE_KEY;

  if (!ethPrivateKey) {
    console.error(JSON.stringify({
      ok: false,
      error: 'ETH_PRIVATE_KEY environment variable required'
    }));
    process.exit(1);
  }

  // Read files
  if (!fs.existsSync(bundlePath)) {
    console.error(JSON.stringify({ ok: false, error: `Bundle not found: ${bundlePath}` }));
    process.exit(1);
  }
  if (!fs.existsSync(manifestPath)) {
    console.error(JSON.stringify({ ok: false, error: `Manifest not found: ${manifestPath}` }));
    process.exit(1);
  }

  const bundleData = fs.readFileSync(bundlePath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Create signer from ETH private key
  const signer = new EthereumSigner(ethPrivateKey);

  // Create authenticated Turbo client
  // For x402 mode, we configure the token type appropriately
  const turboConfig = {
    signer,
    token: X402_ENABLED ? 'base-usdc' : 'ethereum',
  };

  const turbo = await TurboFactory.authenticated(turboConfig);

  // Compute hashes
  const bundleSha256 = crypto.createHash('sha256').update(bundleData).digest('hex');
  const ownerHash = manifest.owner_hash; // Computed by Python encrypt_pack.py
  const timestamp = Math.floor(Date.now() / 1000);

  // Common tags for bundle
  const bundleTags = [
    { name: 'App-Name', value: 'MEMOS' },
    { name: 'App-Version', value: '2.4' },
    { name: 'Content-Type', value: 'application/octet-stream' },
    { name: 'Type', value: 'bundle' },
    { name: 'Unix-Time', value: String(timestamp) },
    { name: 'Owner-Hash', value: ownerHash },
    { name: 'Bundle-SHA256', value: bundleSha256 },
  ];

  try {
    // Get balance (only meaningful for credit mode)
    let balance = null;
    if (!X402_ENABLED) {
      balance = await turbo.getBalance();
    }

    // Upload bundle
    const uploadFn = X402_ENABLED ? uploadWithX402 : uploadWithTurboCredits;
    const bundleResult = await uploadFn(turbo, bundleData, bundleTags, X402_MAX_USDC);

    const bundleTxId = bundleResult.id;

    // Update manifest with bundle tx ID and upload it
    manifest.arweave_tx_id = bundleTxId;
    manifest.arweave_uploaded_at = timestamp;
    const manifestData = Buffer.from(JSON.stringify(manifest, null, 2));
    const manifestSha256 = crypto.createHash('sha256').update(manifestData).digest('hex');

    const manifestTags = [
      { name: 'App-Name', value: 'MEMOS' },
      { name: 'App-Version', value: '2.4' },
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Type', value: 'manifest' },
      { name: 'Unix-Time', value: String(timestamp) },
      { name: 'Owner-Hash', value: ownerHash },
      { name: 'Bundle-TX', value: bundleTxId },
    ];

    const manifestResult = await uploadFn(turbo, manifestData, manifestTags, X402_MAX_USDC);

    const manifestTxId = manifestResult.id;

    // Update local manifest file
    manifest.arweave_manifest_tx_id = manifestTxId;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Estimate upload cost for tip calculation (rough estimate based on size)
    // Actual x402 cost varies, but we estimate ~$0.001 per KB for small files
    const estimatedCostUsdc = Math.max(0.01, (bundleData.length / 1024) * 0.001);

    // Send MAGIC tip (mandatory for x402, non-blocking - backup succeeds even if tip fails)
    let tipResult = { ok: true, skipped: true, reason: 'Non-x402 mode' };
    if (X402_ENABLED) {
      tipResult = await sendMagicTip(ethPrivateKey, estimatedCostUsdc);
    }

    // Output result
    const result = {
      ok: true,
      bundle_tx_id: bundleTxId,
      manifest_tx_id: manifestTxId,
      bundle_size: bundleData.length,
      bundle_sha256: bundleSha256,
      manifest_sha256: manifestSha256,
      bundle_url: `https://arweave.net/${bundleTxId}`,
      manifest_url: `https://arweave.net/${manifestTxId}`,
      payment_mode: X402_ENABLED ? 'x402' : 'turbo_credits',
      magic_tip: tipResult,
    };

    if (X402_ENABLED) {
      result.x402_network = X402_NETWORK;
      result.x402_max_usdc = X402_MAX_USDC;
    } else {
      result.turbo_balance = balance;
    }

    console.log(JSON.stringify(result));

  } catch (err) {
    console.error(JSON.stringify({
      ok: false,
      error: err.message,
      code: err.code,
      payment_mode: X402_ENABLED ? 'x402' : 'turbo_credits',
    }));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
