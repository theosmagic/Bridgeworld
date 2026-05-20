#!/usr/bin/env python3
"""
MemOS Arweave Download Script

Downloads an encrypted memory bundle from Arweave by transaction ID.
Part of the MemOS OpenClaw skill by 0xRelayer.
"""
import argparse
import hashlib
import json
import os
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

# Arweave gateway URLs (fallback chain)
ARWEAVE_GATEWAYS = [
    "https://arweave.net",
    "https://ar-io.net",
    "https://gateway.arweave.co",
]

DEFAULT_TIMEOUT = 60  # seconds


def sha256_bytes(data: bytes) -> str:
    """Compute SHA256 hash of bytes."""
    return hashlib.sha256(data).hexdigest()


def download_from_gateway(tx_id: str, gateway: str, timeout: int) -> bytes:
    """Download transaction data from a specific gateway."""
    url = f"{gateway}/{tx_id}"
    req = Request(url, headers={"User-Agent": "MemOS/2.1"})

    with urlopen(req, timeout=timeout) as response:
        return response.read()


def download_bundle(tx_id: str, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    """
    Download bundle from Arweave, trying multiple gateways.

    Raises SystemExit if all gateways fail.
    """
    errors = []

    for gateway in ARWEAVE_GATEWAYS:
        try:
            data = download_from_gateway(tx_id, gateway, timeout)
            return data
        except HTTPError as e:
            errors.append(f"{gateway}: HTTP {e.code}")
        except URLError as e:
            errors.append(f"{gateway}: {e.reason}")
        except TimeoutError:
            errors.append(f"{gateway}: timeout")
        except Exception as e:
            errors.append(f"{gateway}: {e}")

    raise SystemExit(
        f"Failed to download from all gateways:\n" +
        "\n".join(f"  - {err}" for err in errors)
    )


def get_transaction_status(tx_id: str, gateway: str = ARWEAVE_GATEWAYS[0]) -> dict:
    """Get transaction status from Arweave."""
    url = f"{gateway}/tx/{tx_id}/status"
    req = Request(url, headers={"User-Agent": "MemOS/2.1"})

    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except HTTPError as e:
        if e.code == 404:
            return {"status": "pending"}
        raise


def verify_and_save(
    tx_id: str,
    output_path: Path,
    expected_sha256: str = None,
    timeout: int = DEFAULT_TIMEOUT
) -> dict:
    """
    Download bundle from Arweave, verify checksum, and save to file.

    Returns download result with verification status.
    """
    # Check transaction status
    status = get_transaction_status(tx_id)
    if status.get("status") == "pending":
        raise SystemExit(
            f"Transaction {tx_id} is still pending confirmation. "
            "Wait for block confirmation before downloading."
        )

    # Download the bundle
    data = download_bundle(tx_id, timeout)

    # Verify checksum if provided
    actual_sha256 = sha256_bytes(data)
    checksum_valid = True

    if expected_sha256:
        if expected_sha256 != actual_sha256:
            raise SystemExit(
                f"Checksum mismatch! Expected: {expected_sha256}, Got: {actual_sha256}\n"
                "This may indicate data corruption or tampering. DO NOT use this bundle."
            )

    # Save to file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(data)

    return {
        "ok": True,
        "tx_id": tx_id,
        "output_path": str(output_path),
        "size_bytes": len(data),
        "bundle_sha256": actual_sha256,
        "checksum_verified": expected_sha256 is not None,
        "downloaded_at": int(time.time()),
    }


def main():
    ap = argparse.ArgumentParser(
        description="MemOS: Download encrypted bundle from Arweave."
    )
    ap.add_argument("--tx-id", required=True, help="Arweave transaction ID")
    ap.add_argument("--out", required=True, help="Output file path for downloaded bundle")
    ap.add_argument("--manifest", help="Manifest JSON to read expected checksum from")
    ap.add_argument("--expected-sha256", help="Expected SHA256 checksum (or use --manifest)")
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT,
                    help=f"Download timeout in seconds (default: {DEFAULT_TIMEOUT})")
    ap.add_argument("--status-only", action="store_true",
                    help="Only check transaction status, don't download")
    args = ap.parse_args()

    tx_id = args.tx_id

    # Status check only
    if args.status_only:
        status = get_transaction_status(tx_id)
        print(json.dumps({"tx_id": tx_id, **status}, indent=2))
        return

    # Get expected checksum
    expected_sha256 = args.expected_sha256

    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.exists():
            raise SystemExit(f"Manifest not found: {manifest_path}")
        manifest = json.loads(manifest_path.read_text())
        expected_sha256 = manifest.get("bundle_sha256")

        # Verify tx_id matches manifest
        manifest_tx_id = manifest.get("arweave_tx_id")
        if manifest_tx_id and manifest_tx_id != tx_id:
            raise SystemExit(
                f"Transaction ID mismatch: manifest says {manifest_tx_id}, you requested {tx_id}"
            )

    output_path = Path(args.out).resolve()

    result = verify_and_save(
        tx_id=tx_id,
        output_path=output_path,
        expected_sha256=expected_sha256,
        timeout=args.timeout,
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
