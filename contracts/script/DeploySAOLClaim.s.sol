// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {SAOLClaim} from "../claim/SAOLClaim.sol";

/// @notice Deploy SAOLClaim to Abstract Chain (2741) or Base (8453).
///
/// Required env:
///   SAOL_TOKEN   — SAOL contract address
///   MERKLE_ROOT  — bytes32 root from generate-merkle.ts
///   OWNER        — address that can open/close claims and recover tokens
///
/// Run (Abstract):
///   forge script contracts/script/DeploySAOLClaim.s.sol \
///     --rpc-url abstract --broadcast --verify
///
/// Run (Base):
///   forge script contracts/script/DeploySAOLClaim.s.sol \
///     --rpc-url base --broadcast --verify
contract DeploySAOLClaim is Script {
    function run() external {
        address token = vm.envAddress("SAOL_TOKEN");
        bytes32 root  = vm.envBytes32("MERKLE_ROOT");
        address owner = vm.envAddress("OWNER");

        vm.startBroadcast();

        SAOLClaim claim = new SAOLClaim(token, root, owner);

        console2.log("SAOLClaim deployed:", address(claim));
        console2.log("  token :", token);
        console2.log("  root  :", vm.toString(root));
        console2.log("  owner :", owner);

        vm.stopBroadcast();
    }
}
