#!/usr/bin/env python3
"""
MemOS Encrypt/Pack Script

Encrypts a memory directory for backup to Arweave.
Part of the MemOS OpenClaw skill by 0xRelayer.
"""
import argparse
import hashlib
import hmac
import json
import os
import tarfile
import tempfile
import time
from pathlib import Path

try:
    from eth_account import Account
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
except Exception as e:
    raise SystemExit("Missing deps. Install: pip install eth-account cryptography") from e

# Current KDF salt version - increment for key rotation
CURRENT_SALT_VERSION = "memos-v2"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def derive_key(eth_private_key: str, salt_version: str = CURRENT_SALT_VERSION) -> tuple[bytes, str, str]:
    """
    Deterministic key derivation from ETH private key.

    Returns: (encryption_key, eth_address, owner_hash)

    The owner_hash is used for Arweave discovery. It's computed as:
        SHA256(address + HKDF(private_key, "memos:discovery"))

    This makes it unpredictable to attackers who only know the address,
    preventing spam attacks on the discovery mechanism.
    """
    # Normalize key format
    if eth_private_key.startswith('0x'):
        key_bytes = bytes.fromhex(eth_private_key[2:])
    else:
        key_bytes = bytes.fromhex(eth_private_key)

    # Validate key length
    if len(key_bytes) != 32:
        raise ValueError("ETH private key must be exactly 32 bytes (64 hex chars)")

    # Get address for manifest
    acct = Account.from_key(eth_private_key)
    address = acct.address.lower()

    # Derive encryption key directly from private key (deterministic)
    hkdf_enc = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt_version.encode(),
        info=f"memos:encryption:{address}".encode(),
    )
    key = hkdf_enc.derive(key_bytes)

    # Derive discovery secret for Owner-Hash (prevents spam attacks)
    hkdf_disc = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt_version.encode(),
        info=b"memos:discovery",
    )
    discovery_secret = hkdf_disc.derive(key_bytes)

    # Owner-Hash = SHA256(address + discovery_secret)
    owner_hash = hashlib.sha256(address.encode() + discovery_secret).hexdigest()

    return key, acct.address, owner_hash


# Fields excluded from HMAC signature computation
# - manifest_signature: the signature itself
# - arweave_*: added by upload.mjs AFTER signing
EXCLUDED_FROM_SIGNATURE = frozenset({
    "manifest_signature",
    "arweave_tx_id",
    "arweave_uploaded_at",
    "arweave_manifest_tx_id",
})


def sign_manifest(manifest_data: dict, encryption_key: bytes) -> str:
    """Sign manifest with HMAC-SHA256 using encryption key.

    Note: Excludes post-upload fields (arweave_*) for compatibility with
    decrypt_unpack.py verification. These fields are added by upload.mjs
    after the manifest is signed.
    """
    data = {k: v for k, v in manifest_data.items() if k not in EXCLUDED_FROM_SIGNATURE}
    canonical = json.dumps(data, separators=(',', ':'), sort_keys=True).encode()
    signature = hmac.new(encryption_key, canonical, hashlib.sha256).hexdigest()
    return signature


def get_next_sequence(index_path: Path, eth_address: str) -> int:
    """Get next sequence number from local index."""
    if not index_path.exists():
        return 1
    try:
        index = json.loads(index_path.read_text())
        addr_lower = eth_address.lower()
        return index.get(addr_lower, {}).get("sequence", 0) + 1
    except (json.JSONDecodeError, KeyError):
        return 1


def update_local_index(index_path: Path, eth_address: str, sequence: int, bundle_sha256: str):
    """Update local backup index."""
    index = {}
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text())
        except json.JSONDecodeError:
            index = {}

    addr_lower = eth_address.lower()
    index[addr_lower] = {
        "sequence": sequence,
        "bundle_sha256": bundle_sha256,
        "updated_at": int(time.time())
    }

    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps(index, indent=2))


def pack_dir(input_dir: Path, tar_path: Path) -> dict:
    files = []
    with tarfile.open(tar_path, "w:gz") as tar:
        for p in sorted(input_dir.rglob("*")):
            if p.is_file():
                rel = p.relative_to(input_dir).as_posix()
                tar.add(p, arcname=rel)
                files.append({"path": rel, "size": p.stat().st_size})
    return {"file_count": len(files), "files": files}


def main():
    ap = argparse.ArgumentParser(description="MemOS: Pack and encrypt memory directory.")
    ap.add_argument("--input", required=True, help="Directory to back up")
    ap.add_argument("--out", required=True, help="Encrypted output file path")
    ap.add_argument("--manifest", required=True, help="Manifest JSON output path")
    ap.add_argument("--index", default=os.path.expanduser("~/.memos/backup_index.json"),
                    help="Local backup index path (default: ~/.memos/backup_index.json)")
    args = ap.parse_args()

    # Security: Get key from environment only - never via CLI to prevent exposure in ps/history
    eth_private_key = os.getenv("ETH_PRIVATE_KEY")
    if not eth_private_key:
        raise SystemExit("ETH_PRIVATE_KEY environment variable required. Do NOT pass keys via command line.")

    input_dir = Path(args.input).resolve()
    out_path = Path(args.out).resolve()
    manifest_path = Path(args.manifest).resolve()
    index_path = Path(args.index).resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"Input directory not found: {input_dir}")

    # Validate input has files
    file_count = sum(1 for p in input_dir.rglob("*") if p.is_file())
    if file_count == 0:
        raise SystemExit("Empty backup: input directory contains no files")

    key, address, owner_hash = derive_key(eth_private_key)

    # Get next sequence number
    sequence = get_next_sequence(index_path, address)

    with tempfile.TemporaryDirectory() as td:
        tar_path = Path(td) / "payload.tar.gz"
        inventory = pack_dir(input_dir, tar_path)
        plaintext = tar_path.read_bytes()

    # Check bundle size
    if len(plaintext) > 100 * 1024 * 1024:  # 100 MB
        raise SystemExit(f"Bundle too large: {len(plaintext)} bytes (max 100 MB)")

    created_at = int(time.time())

    # Create Associated Authenticated Data (AAD) to bind metadata to ciphertext
    aad = json.dumps({
        "version": 2,
        "eth_address": address.lower(),
        "timestamp": created_at,
    }, separators=(',', ':'), sort_keys=True).encode()

    nonce = os.urandom(12)
    cipher = ChaCha20Poly1305(key)
    ciphertext = cipher.encrypt(nonce, plaintext, aad)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(nonce + ciphertext)

    bundle_sha = sha256_file(out_path)
    aad_sha256 = hashlib.sha256(aad).hexdigest()

    # Build manifest (without signature first)
    manifest = {
        "version": 2,
        "sequence": sequence,
        "created_at": created_at,
        "eth_address": address,
        "owner_hash": owner_hash,  # For Arweave discovery (spam-resistant)
        "cipher": "chacha20poly1305",
        "kdf": "hkdf-sha256-direct",
        "kdf_salt_version": CURRENT_SALT_VERSION,
        "checksum_algorithm": "sha256",
        "aad_sha256": aad_sha256,
        "bundle_sha256": bundle_sha,
        "bundle_size_bytes": len(nonce) + len(ciphertext),
        "inventory": inventory,
    }

    # Sign the manifest
    manifest["manifest_signature"] = sign_manifest(manifest, key)

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2))

    # Update local index
    update_local_index(index_path, address, sequence, bundle_sha)

    print(json.dumps({
        "ok": True,
        "bundle": str(out_path),
        "manifest": str(manifest_path),
        "bundle_sha256": bundle_sha,
        "eth_address": address,
        "sequence": sequence,
        "files": inventory["file_count"],
    }))


if __name__ == "__main__":
    main()
