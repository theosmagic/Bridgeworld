#!/usr/bin/env python3
"""
MemOS Arweave Discovery Script

Finds all backups for an ETH address on Arweave.
Used for reconstitution after agent wipe.
Part of the MemOS OpenClaw skill by 0xRelayer.
"""
import argparse
import hashlib
import json
import os
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

ARWEAVE_GRAPHQL = "https://arweave.net/graphql"

QUERY_MANIFESTS = """
query {
  transactions(
    tags: [
      { name: "App-Name", values: ["MEMOS"] },
      { name: "Type", values: ["manifest"] },
      { name: "Owner-Hash", values: ["%s"] }
    ],
    first: %d
  ) {
    edges {
      node {
        id
        tags {
          name
          value
        }
        block {
          timestamp
          height
        }
      }
    }
  }
}
"""


def compute_owner_hash(eth_private_key: str, salt_version: str = "memos-v2") -> str:
    """
    Compute the secure Owner-Hash from ETH private key.

    This hash is unpredictable to attackers who only know the address,
    preventing spam attacks on the discovery mechanism.
    """
    try:
        from eth_account import Account
        from cryptography.hazmat.primitives.kdf.hkdf import HKDF
        from cryptography.hazmat.primitives import hashes
    except ImportError:
        raise SystemExit("Missing deps. Install: pip install eth-account cryptography")

    # Normalize key format
    if eth_private_key.startswith('0x'):
        key_bytes = bytes.fromhex(eth_private_key[2:])
    else:
        key_bytes = bytes.fromhex(eth_private_key)

    acct = Account.from_key(eth_private_key)
    address = acct.address.lower()

    # Derive discovery secret
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt_version.encode(),
        info=b"memos:discovery",
    )
    discovery_secret = hkdf.derive(key_bytes)

    # Owner-Hash = SHA256(address + discovery_secret)
    return hashlib.sha256(address.encode() + discovery_secret).hexdigest()


def query_arweave(owner_hash: str, limit: int = 100) -> list:
    """Query Arweave GraphQL for backup manifests with matching Owner-Hash."""
    query = QUERY_MANIFESTS % (owner_hash, limit)

    req = Request(
        ARWEAVE_GRAPHQL,
        data=json.dumps({"query": query}).encode(),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "MemOS/2.2",
        },
    )

    try:
        with urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
    except HTTPError as e:
        raise SystemExit(f"Arweave query failed: HTTP {e.code}")
    except URLError as e:
        raise SystemExit(f"Arweave query failed: {e.reason}")

    edges = result.get("data", {}).get("transactions", {}).get("edges", [])

    backups = []
    for edge in edges:
        node = edge.get("node", {})
        tags = {t["name"]: t["value"] for t in node.get("tags", [])}
        block = node.get("block") or {}
        bundle_tx = tags.get("Bundle-TX")

        backups.append({
            "manifest_tx_id": node.get("id"),
            "bundle_tx_id": bundle_tx,
            "timestamp": block.get("timestamp"),
            "block_height": block.get("height"),
            "app_version": tags.get("App-Version"),
            "manifest_url": f"https://arweave.net/{node.get('id')}",
            "bundle_url": f"https://arweave.net/{bundle_tx}" if bundle_tx else None,
        })

    # Sort by timestamp descending (most recent first)
    backups.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)

    return backups


def main():
    ap = argparse.ArgumentParser(
        description="MemOS: Discover backups on Arweave for reconstitution.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Find all backups for current ETH key
  ETH_PRIVATE_KEY=0x... python arweave_discover.py

  # Limit results
  python arweave_discover.py --limit 10

Note: ETH_PRIVATE_KEY is required because the Owner-Hash is derived from the
private key (not just the address) to prevent spam attacks on discovery.
"""
    )
    ap.add_argument("--limit", type=int, default=100, help="Max results (default: 100)")
    args = ap.parse_args()

    # Get ETH private key (required for secure owner_hash computation)
    eth_key = os.getenv("ETH_PRIVATE_KEY")
    if not eth_key:
        raise SystemExit(
            "ETH_PRIVATE_KEY environment variable required.\n"
            "The private key is needed to compute the secure Owner-Hash for discovery."
        )

    try:
        from eth_account import Account
        if eth_key.startswith('0x'):
            acct = Account.from_key(eth_key)
        else:
            acct = Account.from_key('0x' + eth_key)
        eth_address = acct.address
    except Exception as e:
        raise SystemExit(f"Invalid ETH key: {e}")

    owner_hash = compute_owner_hash(eth_key)

    backups = query_arweave(owner_hash, limit=args.limit)

    print(json.dumps({
        "ok": True,
        "eth_address": eth_address,
        "owner_hash": owner_hash,
        "backup_count": len(backups),
        "backups": backups,
    }, indent=2))


if __name__ == "__main__":
    main()
