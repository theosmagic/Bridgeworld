#!/usr/bin/env bash
# Deploy the official Covenant Safe (2-of-3) via Ledger Flex.
# Usage: ./scripts/deploy-safe-cast.sh base | arbitrum
# Prereqs: Ledger plugged in, Ethereum app OPEN, blind signing ENABLED,
#          Ledger Live CLOSED (it locks the USB device),
#          gas at 0x9696B5c3C0ffb2Baf940d633777FfFcA8f99863f on the target chain.
set -euo pipefail

FACTORY=0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67
EXPECTED_SAFE=0xCa2dcA103e52592Bc20b308F0808AC294AB8272E
LEDGER=0x697488a2b24a85ABC5FCb260EE0Ae36Bd9BA59dA
HD_PATH="m/44'/60'/0'/0/0"

# createProxyWithNonce(SafeL2 1.4.1, setup(2-of-3 owners), covenant salt)
DATA=0x1688f0b900000000000000000000000029fcb43b46531bca003ddc8fcb67ffe91900c7620000000000000000000000000000000000000000000000000000000000000060d9acebe34ab707f8f90931c9ba1dd60f86ac1716c4d7c020630bd420a6cf8fc800000000000000000000000000000000000000000000000000000000000001a4b63e800d0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000180000000000000000000000000fd0732dc9e303f09fcef3a7388ad10a83459ec990000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000697488a2b24a85abc5fcb260ee0ae36bd9ba59da000000000000000000000000c3a1f83d299e47816635bb8b3ebe40cdb8e87a370000000000000000000000003336f936486a8fe4bc7e0b491c60c1220ef247c7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000

case "${1:-}" in
  base)     RPC=https://mainnet.base.org ;;
  arbitrum) RPC=https://arbitrum-one-rpc.publicnode.com ;;
  *) echo "Usage: $0 base|arbitrum"; exit 1 ;;
esac

echo "Chain RPC:   $RPC"
echo "Sender:      $LEDGER (Ledger Flex, $HD_PATH)"
echo "Factory:     $FACTORY"
echo "Safe target: $EXPECTED_SAFE"

if [[ "$(cast code --rpc-url "$RPC" "$EXPECTED_SAFE")" != "0x" ]]; then
  echo "Safe already deployed on this chain. Nothing to do."
  exit 0
fi

BAL=$(cast balance --rpc-url "$RPC" "$LEDGER")
echo "Ledger balance: $(cast from-wei "$BAL") ETH"
if [[ "$BAL" == "0" ]]; then
  echo "ERROR: no gas at $LEDGER on this chain. Fund it first (~0.0001 ETH is plenty)."
  exit 1
fi

echo "Confirm on the Ledger screen when prompted..."
cast send --ledger --mnemonic-derivation-path "$HD_PATH" \
  --rpc-url "$RPC" "$FACTORY" "$DATA"

echo "Verifying deployment..."
CODE=$(cast code --rpc-url "$RPC" "$EXPECTED_SAFE")
if [[ "$CODE" != "0x" ]]; then
  echo "SUCCESS: Safe live at $EXPECTED_SAFE"
  echo "Owners:"
  cast call --rpc-url "$RPC" "$EXPECTED_SAFE" "getOwners()(address[])"
  echo "Threshold:"
  cast call --rpc-url "$RPC" "$EXPECTED_SAFE" "getThreshold()(uint256)"
else
  echo "WARNING: tx sent but no code at $EXPECTED_SAFE — check the tx receipt above."
fi
