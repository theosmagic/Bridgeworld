#!/usr/bin/env python3
"""
MemOS Arweave Upload Script (Turbo)

Uploads encrypted memory bundle + manifest to Arweave via Turbo.
Supports two payment modes:
  1. Turbo Credits (default) - pre-fund at turbo-topup.com
  2. x402 with Base USDC - pay-per-upload micropayments

Uses ETH signing - no separate AR wallet needed.
Part of the MemOS OpenClaw skill by 0xRelayer.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

TURBO_DIR = Path(__file__).parent / "turbo"


def check_turbo_installed() -> bool:
    """Check if Turbo dependencies are installed."""
    node_modules = TURBO_DIR / "node_modules"
    turbo_sdk = node_modules / "@ardrive" / "turbo-sdk"
    # Check both node_modules exists AND turbo-sdk is present (catches partial installs)
    return node_modules.exists() and turbo_sdk.exists()


def install_turbo() -> bool:
    """Install Turbo dependencies."""
    print("Installing Turbo dependencies...", file=sys.stderr)
    result = subprocess.run(
        ["npm", "install"],
        cwd=TURBO_DIR,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"npm install failed: {result.stderr}", file=sys.stderr)
        return False
    return True


def upload_via_turbo(
    bundle_path: Path,
    manifest_path: Path,
    dry_run: bool = False,
    x402: bool = False,
    x402_max_usdc: float = 1.00,
    x402_network: str = "base"
) -> dict:
    """Upload bundle and manifest via Turbo.

    Args:
        bundle_path: Path to encrypted bundle
        manifest_path: Path to manifest JSON
        dry_run: Validate without uploading
        x402: Enable x402 payments with Base USDC
        x402_max_usdc: Maximum USDC to spend per upload (default $1.00)
        x402_network: Network for x402 payments (base or base-sepolia)
    """
    if not check_turbo_installed():
        if not install_turbo():
            raise SystemExit(
                "Failed to install Turbo dependencies.\n"
                "Manual fix: cd scripts/turbo && npm install\n"
                "If install gets killed, your system may be low on memory."
            )

    eth_key = os.getenv("ETH_PRIVATE_KEY")
    if not eth_key:
        raise SystemExit("ETH_PRIVATE_KEY environment variable required")

    if dry_run:
        # For dry run, just validate files exist and return estimate
        manifest = json.loads(manifest_path.read_text())
        bundle_size = bundle_path.stat().st_size
        return {
            "ok": True,
            "dry_run": True,
            "bundle_size": bundle_size,
            "bundle_sha256": manifest.get("bundle_sha256"),
            "owner_hash": manifest.get("owner_hash"),
            "payment_mode": "x402" if x402 else "turbo_credits",
            "message": "Dry run - no upload performed. Run without --dry-run to upload.",
        }

    # Build environment with x402 options
    env = {**os.environ, "ETH_PRIVATE_KEY": eth_key}
    if x402:
        env["X402_ENABLED"] = "true"
        env["X402_MAX_USDC"] = str(x402_max_usdc)
        env["X402_NETWORK"] = x402_network

    # Call the Node.js Turbo upload script
    result = subprocess.run(
        ["node", "upload.mjs", str(bundle_path), str(manifest_path)],
        cwd=TURBO_DIR,
        capture_output=True,
        text=True,
        env=env
    )

    if result.returncode != 0:
        # Try to parse structured error from stderr (Node script outputs JSON)
        try:
            error = json.loads(result.stderr)
            return error
        except json.JSONDecodeError:
            pass

        # Try stdout (some Node errors go there)
        try:
            error = json.loads(result.stdout)
            return error
        except json.JSONDecodeError:
            pass

        # Fallback: surface all available diagnostic info
        error_parts = []
        if result.stderr.strip():
            error_parts.append(f"stderr: {result.stderr.strip()}")
        if result.stdout.strip():
            error_parts.append(f"stdout: {result.stdout.strip()}")
        error_parts.append(f"exit_code: {result.returncode}")

        error_msg = "; ".join(error_parts) if error_parts else f"Node process failed with exit code {result.returncode}"
        return {"ok": False, "error": error_msg}

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"ok": False, "error": f"Invalid response: {result.stdout}"}


def main():
    ap = argparse.ArgumentParser(
        description="MemOS: Upload encrypted bundle to Arweave via Turbo."
    )
    ap.add_argument("--bundle", required=True, help="Encrypted bundle file path")
    ap.add_argument("--manifest", required=True, help="Manifest JSON file path")
    ap.add_argument("--dry-run", action="store_true",
                    help="Validate without uploading")

    # x402 payment options
    ap.add_argument("--x402", action="store_true",
                    help="Use x402 micropayments with Base USDC (no pre-funding needed)")
    ap.add_argument("--x402-max-usdc", type=float, default=1.00,
                    help="Max USDC to spend per upload (default: $1.00)")
    ap.add_argument("--x402-network", choices=["base", "base-sepolia"], default="base",
                    help="x402 network (default: base mainnet)")

    args = ap.parse_args()

    bundle_path = Path(args.bundle).resolve()
    manifest_path = Path(args.manifest).resolve()

    if not bundle_path.exists():
        raise SystemExit(f"Bundle not found: {bundle_path}")
    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    result = upload_via_turbo(
        bundle_path,
        manifest_path,
        dry_run=args.dry_run,
        x402=args.x402,
        x402_max_usdc=args.x402_max_usdc,
        x402_network=args.x402_network
    )

    print(json.dumps(result, indent=2))

    if not result.get("ok"):
        sys.exit(1)


if __name__ == "__main__":
    main()
