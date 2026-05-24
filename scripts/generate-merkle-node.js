/**
 * ESM Merkle generator — runs with plain `node` from the project root.
 * Reads data/recipients.json, writes data/merkle-tree.json.
 */
import { MerkleTree } from "merkletreejs";
import { keccak256, encodePacked, getAddress } from "viem";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// merkletreejs needs a Buffer-returning hash function
function hashFn(data) {
  return createHash("sha3-256").update(data).digest();
}

// Use Node's built-in crypto SHA3 is not available — use keccak via viem's encodePacked trick
// Instead: use the keccak256 from viem but return Buffer for merkletreejs
function keccakBuf(data) {
  const hex = keccak256(data);
  return Buffer.from(hex.slice(2), "hex");
}

function makeLeaf(address, amount) {
  const hash = keccak256(
    encodePacked(["address", "uint256"], [getAddress(address), BigInt(amount)])
  );
  return Buffer.from(hash.slice(2), "hex");
}

const inputPath  = process.env.RECIPIENTS ?? resolve(__dirname, "../data/recipients.json");
const outputPath = resolve(__dirname, "../data/merkle-tree.json");

const recipients = JSON.parse(readFileSync(inputPath, "utf8"));
if (!recipients.length) throw new Error("recipients.json is empty");

// Deduplicate — last entry wins
const deduped = new Map();
for (const r of recipients) {
  deduped.set(getAddress(r.address), r.amount);
}

const entries = [...deduped.entries()].map(([address, amount]) => ({ address, amount }));
const leaves  = entries.map((e) => makeLeaf(e.address, e.amount));

const tree = new MerkleTree(leaves, keccakBuf, { sortPairs: true });
const root = "0x" + tree.getRoot().toString("hex");

const totalAmount = entries.reduce((acc, e) => acc + BigInt(e.amount), 0n).toString();

const output = {
  root,
  totalAmount,
  count: entries.length,
  leaves: entries.map((e, i) => ({
    address: e.address,
    amount:  e.amount,
    proof:   tree.getHexProof(leaves[i]),
  })),
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log("Merkle root  :", root);
console.log("Recipients   :", entries.length);
console.log("Total SAOL   :", (BigInt(totalAmount) / 10n ** 18n).toString(), "SAOL");
console.log("Output       :", outputPath);
