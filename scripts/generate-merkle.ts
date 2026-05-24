/**
 * Merkle tree generator for SAOLClaim.
 *
 * Input:  recipients.json  — [{ "address": "0x...", "amount": "1000000000000000000" }, ...]
 * Output: merkle-tree.json — { root, leaves: [{ address, amount, proof }] }
 *
 * Usage:
 *   npx ts-node scripts/generate-merkle.ts
 *   RECIPIENTS=path/to/file.json npx ts-node scripts/generate-merkle.ts
 *
 * Leaf encoding (matches SAOLClaim.sol):
 *   keccak256(abi.encodePacked(address, uint256))
 */

import { keccak256, encodePacked, getAddress } from "viem";
import { MerkleTree } from "merkletreejs";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface Recipient {
  address: string;
  amount: string; // wei string
}

interface LeafEntry {
  address: string;
  amount: string;
  proof: string[];
}

interface MerkleOutput {
  root: string;
  totalAmount: string;
  count: number;
  leaves: LeafEntry[];
}

function makeLeaf(address: string, amount: string): Buffer {
  const hash = keccak256(
    encodePacked(["address", "uint256"], [getAddress(address) as `0x${string}`, BigInt(amount)])
  );
  return Buffer.from(hash.slice(2), "hex");
}

async function main() {
  const inputPath = process.env.RECIPIENTS ?? resolve(__dirname, "../data/recipients.json");
  const outputPath = resolve(__dirname, "../data/merkle-tree.json");

  const recipients: Recipient[] = JSON.parse(readFileSync(inputPath, "utf8"));

  if (!recipients.length) throw new Error("recipients.json is empty");

  // Deduplicate by address (last entry wins)
  const deduped = new Map<string, string>();
  for (const r of recipients) {
    deduped.set(getAddress(r.address), r.amount);
  }

  const entries = [...deduped.entries()].map(([address, amount]) => ({ address, amount }));
  const leaves = entries.map((e) => makeLeaf(e.address, e.amount));

  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = "0x" + tree.getRoot().toString("hex");

  const totalAmount = entries.reduce((acc, e) => acc + BigInt(e.amount), 0n).toString();

  const output: MerkleOutput = {
    root,
    totalAmount,
    count: entries.length,
    leaves: entries.map((e, i) => ({
      address: e.address,
      amount: e.amount,
      proof: tree.getHexProof(leaves[i]),
    })),
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("Merkle root  :", root);
  console.log("Recipients   :", entries.length);
  console.log("Total SAOL   :", (BigInt(totalAmount) / 10n ** 18n).toString(), "SAOL");
  console.log("Output       :", outputPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
