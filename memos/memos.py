#!/usr/bin/env python3
"""
MemOS CLI — Unified command-line interface for memory backup/restore.

Part of the MemOS OpenClaw skill by 0xRelayer.

Usage:
    memos backup [--input DIR]           Encrypt and upload memory to Arweave
    memos restore [--tx-id ID | --latest] Download and decrypt from Arweave
    memos list                            Show backup history
    memos status                          Check configuration and wallet balance
    memos init                            Set up MemOS (generate wallet, create dirs)
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
DEFAULT_SCOPE = "memory/"
DEFAULT_OUT_DIR = Path(tempfile.gettempdir()) / "memos"
INDEX_PATH = Path.home() / ".memos" / "backup_index.json"
TURBO_DIR = SCRIPTS_DIR / "turbo"


def check_turbo_ready() -> tuple[bool, str]:
    """Check if Turbo dependencies are installed. Returns (ready, message)."""
    node_modules = TURBO_DIR / "node_modules"
    # Check for package.json inside turbo-sdk (more reliable than just directory existence)
    turbo_sdk_pkg = node_modules / "@ardrive" / "turbo-sdk" / "package.json"

    if not node_modules.exists():
        return False, f"Turbo not installed. Run: cd {TURBO_DIR} && npm install"

    if not turbo_sdk_pkg.exists():
        return False, f"Turbo install incomplete. Run: cd {TURBO_DIR} && npm install"

    return True, "Turbo ready"


def run_script(script_name: str, args: list, env: dict = None) -> tuple[int, str, str]:
    """Run a MemOS script and return (returncode, stdout, stderr)."""
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name)] + args
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    result = subprocess.run(cmd, capture_output=True, text=True, env=full_env)
    return result.returncode, result.stdout, result.stderr


def extract_error(stdout: str, stderr: str) -> str:
    """Extract error message from script output (checks stdout JSON first, then stderr)."""
    # Scripts output JSON to stdout, even on error
    if stdout.strip():
        try:
            result = json.loads(stdout)
            if isinstance(result, dict) and result.get("error"):
                return result.get("error")
        except json.JSONDecodeError:
            pass
    # Fallback to stderr or raw stdout
    if stderr.strip():
        return stderr.strip()
    if stdout.strip():
        return stdout.strip()
    return "Unknown error (no output)"


def cmd_backup(args):
    """Encrypt and upload memory directory to Arweave."""
    input_dir = Path(args.input or os.getenv("VAULT_SCOPE_PATH", DEFAULT_SCOPE)).resolve()
    out_dir = Path(args.out_dir or os.getenv("VAULT_OUT_DIR", DEFAULT_OUT_DIR)).resolve()

    if not input_dir.exists():
        print(json.dumps({"ok": False, "error": f"Input directory not found: {input_dir}"}))
        return 1

    # Check Turbo ready before starting (skip for local-only)
    if not args.local_only:
        ready, msg = check_turbo_ready()
        if not ready:
            print(json.dumps({"ok": False, "error": msg}))
            return 1

    out_dir.mkdir(parents=True, exist_ok=True)
    bundle_path = out_dir / "latest.bundle"
    manifest_path = out_dir / "latest.manifest.json"

    # Step 1: Encrypt
    print(f"Encrypting {input_dir}...", file=sys.stderr)
    code, stdout, stderr = run_script("encrypt_pack.py", [
        "--input", str(input_dir),
        "--out", str(bundle_path),
        "--manifest", str(manifest_path),
    ])

    if code != 0:
        print(json.dumps({"ok": False, "step": "encrypt", "error": extract_error(stdout, stderr)}))
        return code

    encrypt_result = json.loads(stdout)

    if args.local_only:
        print(json.dumps({
            "ok": True,
            "local_only": True,
            "bundle": str(bundle_path),
            "manifest": str(manifest_path),
            **encrypt_result,
        }))
        return 0

    # Step 2: Upload
    payment_mode = "x402" if args.x402 else "Turbo credits"
    print(f"Uploading to Arweave ({payment_mode})...", file=sys.stderr)
    upload_args = [
        "--bundle", str(bundle_path),
        "--manifest", str(manifest_path),
    ]
    if args.dry_run:
        upload_args.append("--dry-run")
    if args.x402:
        upload_args.append("--x402")
        upload_args.extend(["--x402-max-usdc", str(args.x402_max_usdc)])
        upload_args.extend(["--x402-network", args.x402_network])

    code, stdout, stderr = run_script("arweave_upload.py", upload_args)

    if code != 0:
        print(json.dumps({"ok": False, "step": "upload", "error": extract_error(stdout, stderr)}))
        return code

    upload_result = json.loads(stdout)

    print(json.dumps({
        "ok": True,
        "sequence": encrypt_result.get("sequence"),
        "files": encrypt_result.get("files"),
        "bundle_tx_id": upload_result.get("bundle_tx_id"),
        "manifest_tx_id": upload_result.get("manifest_tx_id"),
        "bundle_url": upload_result.get("bundle_url"),
        "manifest_url": upload_result.get("manifest_url"),
        "bundle_sha256": encrypt_result.get("bundle_sha256"),
    }))
    return 0


def cmd_restore(args):
    """Download and decrypt memory from Arweave."""
    out_dir = Path(args.out or os.getenv("VAULT_SCOPE_PATH", DEFAULT_SCOPE)).resolve()
    work_dir = Path(args.work_dir or os.getenv("VAULT_OUT_DIR", DEFAULT_OUT_DIR)).resolve()
    work_dir.mkdir(parents=True, exist_ok=True)

    bundle_tx_id = args.tx_id
    manifest_tx_id = None

    # Handle --latest flag: discover backups on Arweave
    if args.latest:
        print("Discovering backups on Arweave...", file=sys.stderr)
        code, stdout, stderr = run_script("arweave_discover.py", ["--limit", "1"])

        if code != 0:
            print(json.dumps({"ok": False, "step": "discover", "error": extract_error(stdout, stderr)}))
            return 1

        discover_result = json.loads(stdout)
        backups = discover_result.get("backups", [])

        if not backups:
            print(json.dumps({
                "ok": False,
                "error": "No backups found on Arweave for this ETH address"
            }))
            return 1

        latest = backups[0]
        manifest_tx_id = latest.get("manifest_tx_id")
        bundle_tx_id = latest.get("bundle_tx_id")

        print(f"Found latest backup: manifest={manifest_tx_id}, bundle={bundle_tx_id}", file=sys.stderr)

    if not bundle_tx_id:
        print(json.dumps({"ok": False, "error": "Either --tx-id or --latest required"}))
        return 1

    bundle_path = work_dir / f"{bundle_tx_id}.bundle"
    manifest_path = work_dir / f"{bundle_tx_id}.manifest.json"

    # Step 1: Download manifest from Arweave (if we have manifest_tx_id)
    if manifest_tx_id:
        print(f"Downloading manifest from Arweave ({manifest_tx_id})...", file=sys.stderr)
        code, stdout, stderr = run_script("arweave_download.py", [
            "--tx-id", manifest_tx_id,
            "--out", str(manifest_path),
        ])
        if code != 0:
            print(json.dumps({"ok": False, "step": "download_manifest", "error": extract_error(stdout, stderr)}))
            return 1

    # Step 2: Download bundle
    print(f"Downloading bundle from Arweave ({bundle_tx_id})...", file=sys.stderr)
    download_args = [
        "--tx-id", bundle_tx_id,
        "--out", str(bundle_path),
    ]

    code, stdout, stderr = run_script("arweave_download.py", download_args)

    if code != 0:
        print(json.dumps({"ok": False, "step": "download_bundle", "error": extract_error(stdout, stderr)}))
        return code

    download_result = json.loads(stdout)

    # Create minimal manifest for decryption if we don't have one
    if not manifest_path.exists():
        manifest = {
            "version": 2,
            "bundle_sha256": download_result.get("bundle_sha256"),
            "arweave_tx_id": bundle_tx_id,
        }
        # We need ETH address - get from env
        eth_key = os.getenv("ETH_PRIVATE_KEY")
        if eth_key:
            try:
                from eth_account import Account
                if eth_key.startswith('0x'):
                    acct = Account.from_key(eth_key)
                else:
                    acct = Account.from_key('0x' + eth_key)
                manifest["eth_address"] = acct.address
            except:
                pass
        manifest_path.write_text(json.dumps(manifest, indent=2))

    # Step 2: Decrypt
    print(f"Decrypting to {out_dir}...", file=sys.stderr)
    decrypt_args = [
        "--bundle", str(bundle_path),
        "--manifest", str(manifest_path),
        "--out", str(out_dir),
    ]
    if args.force:
        decrypt_args.append("--force")

    code, stdout, stderr = run_script("decrypt_unpack.py", decrypt_args)

    if code != 0:
        print(json.dumps({"ok": False, "step": "decrypt", "error": extract_error(stdout, stderr)}))
        return code

    decrypt_result = json.loads(stdout)

    print(json.dumps({
        "ok": True,
        "tx_id": bundle_tx_id,
        "restored_to": str(out_dir),
        "files": decrypt_result.get("files"),
        "sequence": decrypt_result.get("sequence"),
    }))
    return 0


def cmd_list(args):
    """Show backup history from local index."""
    if not INDEX_PATH.exists():
        print(json.dumps({"ok": True, "backups": [], "message": "No backups found"}))
        return 0

    try:
        index = json.loads(INDEX_PATH.read_text())
    except json.JSONDecodeError:
        print(json.dumps({"ok": False, "error": "Corrupted backup index"}))
        return 1

    backups = []
    for address, data in index.items():
        backups.append({
            "eth_address": address,
            "sequence": data.get("sequence"),
            "bundle_sha256": data.get("bundle_sha256"),
            "updated_at": data.get("updated_at"),
        })

    backups.sort(key=lambda x: x.get("updated_at", 0), reverse=True)

    print(json.dumps({"ok": True, "backups": backups}))
    return 0


def cmd_status(args):
    """Check configuration status."""
    status = {
        "ok": True,
        "eth_key_set": bool(os.getenv("ETH_PRIVATE_KEY")),
        "index_path": str(INDEX_PATH),
        "index_exists": INDEX_PATH.exists(),
        "turbo_installed": (SCRIPTS_DIR / "turbo" / "node_modules").exists(),
    }

    # Get ETH address
    eth_key = os.getenv("ETH_PRIVATE_KEY")
    if eth_key:
        try:
            from eth_account import Account
            if eth_key.startswith('0x'):
                acct = Account.from_key(eth_key)
            else:
                acct = Account.from_key('0x' + eth_key)
            status["eth_address"] = acct.address
        except Exception as e:
            status["eth_key_error"] = str(e)

    print(json.dumps(status, indent=2))
    return 0


def cmd_init(args):
    """Initialize MemOS: create directories, install dependencies."""
    print("MemOS Setup", file=sys.stderr)
    print("=" * 40, file=sys.stderr)

    # Create .memos directory
    memos_dir = Path.home() / ".memos"
    memos_dir.mkdir(parents=True, exist_ok=True)
    print(f"Created {memos_dir}", file=sys.stderr)

    # Install Python dependencies via uv (with PEP 668 override)
    requirements_path = SCRIPTS_DIR.parent / "requirements.txt"
    if requirements_path.exists():
        print("Installing Python dependencies via uv...", file=sys.stderr)
        result = subprocess.run(
            ["uv", "pip", "install", "--system", "--break-system-packages", "-r", str(requirements_path)],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"uv install failed: {result.stderr}", file=sys.stderr)
            print("Falling back to pip...", file=sys.stderr)
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "--break-system-packages", "-r", str(requirements_path)],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"pip install failed: {result.stderr}", file=sys.stderr)
                return 1
        print("Python dependencies installed", file=sys.stderr)

    # Install Turbo dependencies
    turbo_dir = SCRIPTS_DIR / "turbo"
    if not (turbo_dir / "node_modules").exists():
        print("Installing Turbo dependencies...", file=sys.stderr)
        result = subprocess.run(
            ["npm", "install"],
            cwd=turbo_dir,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"npm install failed: {result.stderr}", file=sys.stderr)
            return 1
        print("Turbo installed successfully", file=sys.stderr)
    else:
        print("Turbo already installed", file=sys.stderr)

    # Print setup instructions
    print("", file=sys.stderr)
    print("Setup complete!", file=sys.stderr)
    print("", file=sys.stderr)
    print("Next steps:", file=sys.stderr)
    print("  1. Set ETH_PRIVATE_KEY environment variable", file=sys.stderr)
    print("  2. Run: memos backup --input memory/", file=sys.stderr)
    print("", file=sys.stderr)
    print("No Arweave wallet needed - uploads use Turbo with ETH signing.", file=sys.stderr)

    print(json.dumps({
        "ok": True,
        "memos_dir": str(memos_dir),
        "turbo_installed": True,
    }))
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="MemOS — Encrypted memory backup to Arweave",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # backup
    p_backup = subparsers.add_parser("backup", help="Encrypt and upload memory")
    p_backup.add_argument("--input", "-i", help="Directory to back up")
    p_backup.add_argument("--out-dir", help="Working directory for bundles")
    p_backup.add_argument("--local-only", action="store_true", help="Encrypt only, don't upload")
    p_backup.add_argument("--dry-run", action="store_true", help="Check upload cost without uploading")
    # x402 payment options
    p_backup.add_argument("--x402", action="store_true",
                          help="Pay with USDC on Base via x402 (no pre-funding needed)")
    p_backup.add_argument("--x402-max-usdc", type=float, default=1.00,
                          help="Max USDC per upload (default: $1.00)")
    p_backup.add_argument("--x402-network", choices=["base", "base-sepolia"], default="base",
                          help="x402 network (default: base mainnet)")

    # restore
    p_restore = subparsers.add_parser("restore", help="Download and decrypt memory")
    p_restore.add_argument("--tx-id", help="Arweave transaction ID")
    p_restore.add_argument("--latest", action="store_true", help="Restore most recent backup")
    p_restore.add_argument("--out", "-o", help="Output directory")
    p_restore.add_argument("--work-dir", help="Working directory for downloads")
    p_restore.add_argument("--force", action="store_true", help="Overwrite existing output")

    # list
    p_list = subparsers.add_parser("list", help="Show backup history")

    # status
    p_status = subparsers.add_parser("status", help="Check configuration")

    # init
    p_init = subparsers.add_parser("init", help="Initialize MemOS (install Turbo)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    commands = {
        "backup": cmd_backup,
        "restore": cmd_restore,
        "list": cmd_list,
        "status": cmd_status,
        "init": cmd_init,
    }

    return commands[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
