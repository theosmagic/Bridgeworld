// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { GolemMesh } from "../../facets/golem/GolemMesh.sol";

/**
 * DeployGolemMesh — deploy the 3D renderer mesh contract on Abstract chain.
 *
 * Owner = CDP agent wallet (Eternal_⟐_Scribe / Golem operator).
 * Set GOLEM_OWNER env var to the CDP wallet address before running.
 *
 * Usage (after sourcing YubiKey.txt env):
 *   FOUNDRY_PROFILE=facets forge script contracts/script/diamond/DeployGolemMesh.s.sol \
 *     --rpc-url abstract \
 *     --broadcast \
 *     --verify \
 *     -vvv
 *
 * Required env:
 *   ETH_PRIVATE_KEY   — deployer key (vault signer 0x49CEF or CDP agent key)
 *   GOLEM_OWNER       — CDP agent wallet address (owner of the mesh)
 *   ABSCAN_API_KEY    — for on-chain verification
 */
contract DeployGolemMesh is Script {
    function run() external {
        address owner = vm.envOr("GOLEM_OWNER", address(0));
        require(owner != address(0), "DeployGolemMesh: set GOLEM_OWNER env var to CDP wallet address");

        vm.startBroadcast();

        GolemMesh mesh = new GolemMesh(owner);

        console.log("GolemMesh deployed:");
        console.log("  Address:", address(mesh));
        console.log("  Owner:  ", owner);
        console.log("  Chain:  ", block.chainid);

        vm.stopBroadcast();
    }
}
