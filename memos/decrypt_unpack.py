#!/usr/bin/env python3
"""
MemOS Decrypt/Unpack Script

Decrypts and restores a memory backup from Arweave.
Part of the MemOS OpenClaw skill by 0xRelayer.
"""
import argparse
import hashlib
import hmac
import json
import os
import shutil
import tarfile
import tempfile
from pathlib import Path

try:
    from eth_account import Account
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
except Exception as e:
    raise SystemExit("Missing deps. Install: pip install eth-account cryptography") from e

# Default salt version (used for legacy manifests without kdf_salt_version)
DEFAULT_SALT_VERSION = "memos-v2"
LEGACY_SALT_VERSION = "relay-memory-v1"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def derive_key(eth_private_key: str, salt_version: str = DEFAULT_SALT_VERSION) -> tuple[bytes, str, str]:
    """
    Deterministic key derivation from ETH private key.

    Returns: (encryption_key, eth_address, owner_hash)
    Supports both new (memos-v2) and legacy (relay-memory-v1) salt versions.
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

    # Check for legacy salt
    if salt_version == LEGACY_SALT_VERSION:
        # Legacy: signature-based derivation (for backward compatibility)
        from eth_account.messages import encode_defunct
        challenge = f"relay:memory:v1:{address}"
        msg = encode_defunct(text=challenge)
        sig = Account.sign_message(msg, private_key=eth_private_key).signature
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=LEGACY_SALT_VERSION.encode(),
            info=b"relay-memory-encryption-key",
        )
        key = hkdf.derive(sig)
        # Legacy owner hash (just address hash - less secure but backward compatible)
        owner_hash = hashlib.sha256(address.encode()).hexdigest()
    else:
        # New: direct HKDF from private key bytes
        hkdf_enc = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt_version.encode(),
            info=f"memos:encryption:{address}".encode(),
        )
        key = hkdf_enc.derive(key_bytes)

        # Derive discovery secret for secure Owner-Hash
        hkdf_disc = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt_version.encode(),
            info=b"memos:discovery",
        )
        discovery_secret = hkdf_disc.derive(key_bytes)
        owner_hash = hashlib.sha256(address.encode() + discovery_secret).hexdigest()

    return key, acct.address, owner_hash


# Fields added by upload.mjs AFTER signing - must be excluded from HMAC verification
POST_UPLOAD_FIELDS = frozenset({
    "manifest_signature",
    "arweave_tx_id",
    "arweave_uploaded_at",
    "arweave_manifest_tx_id",
})


def verify_manifest_signature(manifest_data: dict, encryption_key: bytes) -> tuple[bool, str]:
    """
    Verify manifest HMAC signature.

    Returns (is_valid, error_message).
    For v2+ manifests, signature is REQUIRED.

    Note: Excludes post-upload fields (arweave_tx_id, arweave_uploaded_at,
    arweave_manifest_tx_id) which are added by upload.mjs after signing.
    """
    expected = manifest_data.get("manifest_signature")
    manifest_version = manifest_data.get("version", 1)

    if not expected:
        if manifest_version >= 2:
            return False, "v2+ manifest requires signature but none found"
        return True, ""  # Legacy unsigned manifest - skip verification

    # Exclude signature and post-upload fields from HMAC computation
    data = {k: v for k, v in manifest_data.items() if k not in POST_UPLOAD_FIELDS}
    canonical = json.dumps(data, separators=(',', ':'), sort_keys=True).encode()
    computed = hmac.new(encryption_key, canonical, hashlib.sha256).hexdigest()

    if hmac.compare_digest(expected, computed):
        return True, ""
    return False, "HMAC signature mismatch"


def check_rollback(index_path: Path, eth_address: str, manifest_sequence: int) -> None:
    """Check for potential rollback attack."""
    if not index_path.exists():
        return
    try:
        index = json.loads(index_path.read_text())
        addr_lower = eth_address.lower()
        known_seq = index.get(addr_lower, {}).get("sequence", 0)
        if manifest_sequence < known_seq:
            raise SystemExit(
                f"SECURITY: Rollback detected! Manifest sequence {manifest_sequence} < known {known_seq}. "
                "This may indicate an attack. Use --ignore-rollback to override (dangerous)."
            )
    except json.JSONDecodeError:
        pass


def update_index_after_restore(index_path: Path, eth_address: str, sequence: int, bundle_sha256: str) -> None:
    """Update local index after successful restore."""
    import time
    index = {}
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text())
        except json.JSONDecodeError:
            index = {}

    addr_lower = eth_address.lower()
    current = index.get(addr_lower, {})

    # Only update if this is a newer or equal sequence
    if sequence >= current.get("sequence", 0):
        index[addr_lower] = {
            "sequence": sequence,
            "bundle_sha256": bundle_sha256,
            "updated_at": int(time.time())
        }
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_path.write_text(json.dumps(index, indent=2))


def safe_extract(tar: tarfile.TarFile, dest_dir: Path) -> None:
    """
    Safely extract tar archive contents, preventing path traversal attacks (CVE-2007-4559).

    Validates each member to ensure:
    - No absolute paths
    - No path components containing '..'
    - No symlinks or hardlinks (which can be used for traversal)
    - Final resolved path is within the destination directory
    """
    dest_dir = dest_dir.resolve()

    for member in tar.getmembers():
        # Reject symlinks and hardlinks - they can be used to escape the target directory
        if member.issym() or member.islnk():
            raise SystemExit(f"Security error: tar contains symlink or hardlink blocked: {member.name}")

        # Reject absolute paths
        if os.path.isabs(member.name):
            raise SystemExit(f"Security error: path traversal blocked (absolute path): {member.name}")

        # Reject paths with .. components
        if ".." in Path(member.name).parts:
            raise SystemExit(f"Security error: path traversal blocked: {member.name}")

        # Verify the resolved path is within destination directory
        target_path = (dest_dir / member.name).resolve()
        if not target_path.is_relative_to(dest_dir):
            raise SystemExit(f"Security error: path traversal blocked (escapes destination): {member.name}")

        # Extract this single member safely
        tar.extract(member, dest_dir)


def main():
    ap = argparse.ArgumentParser(description="MemOS: Decrypt and restore memory bundle.")
    ap.add_argument("--bundle", required=True, help="Encrypted bundle file")
    ap.add_argument("--manifest", required=True, help="Manifest JSON")
    ap.add_argument("--out", required=True, help="Output restore directory")
    ap.add_argument("--force", action="store_true", help="Overwrite existing output directory")
    ap.add_argument("--index", default=os.path.expanduser("~/.memos/backup_index.json"),
                    help="Local backup index path (default: ~/.memos/backup_index.json)")
    ap.add_argument("--ignore-rollback", action="store_true",
                    help="Ignore rollback protection (dangerous)")
    args = ap.parse_args()

    # Security: Get key from environment only - never via CLI to prevent exposure in ps/history
    eth_private_key = os.getenv("ETH_PRIVATE_KEY")
    if not eth_private_key:
        raise SystemExit("ETH_PRIVATE_KEY environment variable required. Do NOT pass keys via command line.")

    bundle_path = Path(args.bundle).resolve()
    manifest_path = Path(args.manifest).resolve()
    out_dir = Path(args.out).resolve()
    index_path = Path(args.index).resolve()

    if not bundle_path.exists():
        raise SystemExit(f"Bundle not found: {bundle_path}")
    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    # Idempotency check: refuse to overwrite unless --force
    if out_dir.exists() and any(out_dir.iterdir()):
        if not args.force:
            raise SystemExit(f"Output directory not empty: {out_dir}. Use --force to overwrite.")

    manifest = json.loads(manifest_path.read_text())
    expected = manifest.get("bundle_sha256")
    actual = sha256_file(bundle_path)
    # Use constant-time comparison to prevent timing attacks
    if expected and not hmac.compare_digest(expected, actual):
        raise SystemExit("Integrity error: bundle checksum mismatch")

    # Determine salt version for key derivation
    salt_version = manifest.get("kdf_salt_version", LEGACY_SALT_VERSION)
    if manifest.get("kdf") == "eth-signature-hkdf-sha256":
        # Legacy manifest format
        salt_version = LEGACY_SALT_VERSION

    key, address, owner_hash = derive_key(eth_private_key, salt_version)
    if manifest.get("eth_address", "").lower() != address.lower():
        raise SystemExit("Key mismatch: ETH signer does not match manifest")

    # Verify manifest signature (required for v2+ manifests)
    sig_valid, sig_error = verify_manifest_signature(manifest, key)
    if not sig_valid:
        raise SystemExit(f"Manifest signature verification failed: {sig_error}")

    # Check for rollback attack
    manifest_sequence = manifest.get("sequence", 0)
    if not args.ignore_rollback and manifest_sequence > 0:
        check_rollback(index_path, address, manifest_sequence)

    raw = bundle_path.read_bytes()
    if len(raw) < 13:
        raise SystemExit("Invalid bundle")

    nonce, ciphertext = raw[:12], raw[12:]

    # Reconstruct AAD from manifest for authenticated decryption
    manifest_version = manifest.get("version", 1)
    if manifest_version >= 2:
        aad = json.dumps({
            "version": 2,
            "eth_address": address.lower(),
            "timestamp": manifest.get("created_at"),
        }, separators=(',', ':'), sort_keys=True).encode()

        # Verify AAD hash if present (constant-time comparison)
        expected_aad_sha = manifest.get("aad_sha256")
        if expected_aad_sha:
            actual_aad_sha = hashlib.sha256(aad).hexdigest()
            if not hmac.compare_digest(expected_aad_sha, actual_aad_sha):
                raise SystemExit("AAD verification failed: hash mismatch")
    elif manifest.get("aad_version") == 1:
        aad = json.dumps({
            "version": 1,
            "eth_address": address.lower(),
        }, separators=(',', ':'), sort_keys=True).encode()

        # Verify AAD hash if present (constant-time comparison)
        expected_aad_sha = manifest.get("aad_sha256")
        if expected_aad_sha:
            actual_aad_sha = hashlib.sha256(aad).hexdigest()
            if not hmac.compare_digest(expected_aad_sha, actual_aad_sha):
                raise SystemExit("AAD verification failed: hash mismatch")
    else:
        # Legacy bundles without AAD (backward compatibility)
        aad = None

    plain = ChaCha20Poly1305(key).decrypt(nonce, ciphertext, aad)

    # Atomic extraction: extract to temp directory first, then rename
    temp_out = out_dir.parent / f".{out_dir.name}.tmp.{os.getpid()}"
    try:
        temp_out.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory() as td:
            tar_path = Path(td) / "payload.tar.gz"
            tar_path.write_bytes(plain)
            with tarfile.open(tar_path, "r:gz") as tar:
                safe_extract(tar, temp_out)

        # Verify file count before committing
        file_count = sum(1 for p in temp_out.rglob("*") if p.is_file())
        expected_files = manifest.get("inventory", {}).get("file_count")
        if isinstance(expected_files, int) and file_count != expected_files:
            raise SystemExit(f"Restore count mismatch: expected {expected_files}, got {file_count}")

        # Atomic rename: remove existing and rename temp to final
        if out_dir.exists():
            shutil.rmtree(out_dir)
        temp_out.rename(out_dir)

    finally:
        # Clean up temp directory on error
        if temp_out.exists():
            shutil.rmtree(temp_out)

    # Update local index with restored sequence
    if manifest_sequence > 0:
        update_index_after_restore(index_path, address, manifest_sequence, expected)

    print(json.dumps({
        "ok": True,
        "restored_to": str(out_dir),
        "files": file_count,
        "sequence": manifest_sequence,
        "eth_address": address,
    }))


if __name__ == "__main__":
    main()
