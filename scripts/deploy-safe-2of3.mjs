#!/usr/bin/env node
/**
 * Official Covenant Safe — 2-of-3 deterministic deployment (Arbitrum One + Base).
 *
 * Owners (docs/WEB3-IDENTITY.md · app/lib/wallet-roles.ts):
 *   Ledger Flex      0x6974…59dA  (hardware)
 *   Coinbase KeyPass 0xc3a1…7A37  (passkey, mobile)
 *   MetaMask Θεός    0x3336…47c7  (operational)
 *
 * Same CREATE2 address on both chains (canonical Safe v1.4.1 factory + fixed salt).
 * Run:  node scripts/deploy-safe-2of3.mjs            — predict + check status
 *       node scripts/deploy-safe-2of3.mjs --tx       — also print raw deploy tx
 */
import {
  createPublicClient,
  http,
  encodeFunctionData,
  keccak256,
  toBytes,
  concatHex,
  getAddress,
  pad,
} from "viem";
import { arbitrum, base } from "viem/chains";

// Safe v1.4.1 canonical (verified against /mnt/VAULT/Safe{wallet}/safe-deployments)
const FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
const SAFE_L2_SINGLETON = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
const FALLBACK_HANDLER = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";

export const OWNERS = [
  "0x697488a2b24a85ABC5FCb260EE0Ae36Bd9BA59dA", // ledgerFlex (current device seed, cast-verified)
  "0xc3a1f83d299E47816635BB8b3EBe40CDb8e87A37", // covenantSmart (KeyPass)
  "0x3336F936486A8FE4bC7E0B491c60c1220EF247c7", // metamaskDeployer (Θεός)
];
export const THRESHOLD = 2n;

// Covenant-derived salt — changing this changes the Safe address everywhere.
export const SALT_NONCE = BigInt(
  keccak256(toBytes("Θεός°•⟐•Σ℧ΛΘ:official-safe:2of3:v1")),
);

const SETUP_ABI = [
  {
    type: "function",
    name: "setup",
    inputs: [
      { type: "address[]", name: "_owners" },
      { type: "uint256", name: "_threshold" },
      { type: "address", name: "to" },
      { type: "bytes", name: "data" },
      { type: "address", name: "fallbackHandler" },
      { type: "address", name: "paymentToken" },
      { type: "uint256", name: "payment" },
      { type: "address", name: "paymentReceiver" },
    ],
  },
];

const FACTORY_ABI = [
  {
    type: "function",
    name: "createProxyWithNonce",
    inputs: [
      { type: "address", name: "_singleton" },
      { type: "bytes", name: "initializer" },
      { type: "uint256", name: "saltNonce" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "proxyCreationCode",
    inputs: [],
    outputs: [{ type: "bytes" }],
    stateMutability: "pure",
  },
];

export const initializer = encodeFunctionData({
  abi: SETUP_ABI,
  functionName: "setup",
  args: [
    OWNERS,
    THRESHOLD,
    "0x0000000000000000000000000000000000000000",
    "0x",
    FALLBACK_HANDLER,
    "0x0000000000000000000000000000000000000000",
    0n,
    "0x0000000000000000000000000000000000000000",
  ],
});

export const deployTxData = encodeFunctionData({
  abi: FACTORY_ABI,
  functionName: "createProxyWithNonce",
  args: [SAFE_L2_SINGLETON, initializer, SALT_NONCE],
});

function predictAddress(proxyCreationCode) {
  const salt = keccak256(
    concatHex([keccak256(initializer), pad(`0x${SALT_NONCE.toString(16)}`, { size: 32 })]),
  );
  const initCodeHash = keccak256(
    concatHex([proxyCreationCode, pad(SAFE_L2_SINGLETON, { size: 32 })]),
  );
  const hash = keccak256(concatHex(["0xff", FACTORY, salt, initCodeHash]));
  return getAddress(`0x${hash.slice(26)}`);
}

const CHAINS = [
  { chain: arbitrum, rpc: "https://arbitrum-one-rpc.publicnode.com" },
  { chain: base, rpc: "https://mainnet.base.org" },
];

async function main() {
  let predicted;
  for (const { chain, rpc } of CHAINS) {
    const client = createPublicClient({ chain, transport: http(rpc) });
    const creationCode = await client.readContract({
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: "proxyCreationCode",
    });
    const addr = predictAddress(creationCode);
    predicted = predicted ?? addr;
    if (addr !== predicted) throw new Error("CREATE2 mismatch across chains");
    const code = await client.getCode({ address: addr });
    const deployed = code && code !== "0x";
    console.log(
      `${chain.name.padEnd(14)} predicted: ${addr}  ${deployed ? "DEPLOYED ✓" : "not deployed"}`,
    );
  }
  console.log(`\nowners (${OWNERS.length}), threshold ${THRESHOLD}:`);
  for (const o of OWNERS) console.log(`  ${o}`);
  if (process.argv.includes("--tx")) {
    console.log(`\ndeploy tx (send on each chain — any sender, no special rights):`);
    console.log(`  to:    ${FACTORY}`);
    console.log(`  value: 0`);
    console.log(`  data:  ${deployTxData}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
