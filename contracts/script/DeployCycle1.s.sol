// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../AtlasMine.sol";
import "../harvester/HarvesterFactory.sol";
import "../harvester/NftHandler.sol";

/**
 * Cycle 1 deployment — Harvester staking infrastructure
 * Audit baseline: ghoul-sol/treasure-staking @ c0840a42
 *
 * Deploy:
 *   forge script script/DeployCycle1.s.sol:DeployScript \
 *     --rpc-url http://system76.ht.local:3060 \
 *     --private-key $ETH_PRIVATE_KEY \
 *     --broadcast
 */
contract DeployScript is Script {
    // MAGIC token on Arbitrum
    address constant MAGIC = 0x539bdE0d7Dbd336b79148AA742883198BBF60342;

    function run() external {
        uint256 deployerKey = vm.envUint("ETH_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy HarvesterFactory
        HarvesterFactory factory = new HarvesterFactory();
        console2.log("HarvesterFactory:", address(factory));

        // 2. Deploy NftHandler (boosts: Legions + Treasures)
        NftHandler nftHandler = new NftHandler();
        console2.log("NftHandler:", address(nftHandler));

        vm.stopBroadcast();

        console2.log("Cycle 1 deployed by:", deployer);
    }
}
