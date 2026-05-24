// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../../harvester/Harvester.sol";
import "../../harvester/HarvesterFactory.sol";
import "../../harvester/NftHandler.sol";
import "../../harvester/Middleman.sol";

/**
 * Cycle 1 deployment — Harvester staking infrastructure on Abstract Chain (2741)
 * Audit baseline: ghoul-sol/treasure-staking @ c0840a42
 *
 * Required env vars:
 *   ETH_PRIVATE_KEY   — deployer private key
 *   MAGIC_TOKEN        — MAGIC token address on target chain
 *   MASTER_OF_COIN     — MasterOfCoin address (or address(0) if not yet deployed)
 *   ATLAS_MINE         — AtlasMine address (or address(0) if not yet deployed)
 *   CORRUPTION_TOKEN   — CorruptionToken address (or address(0) if not yet deployed)
 *   ADMIN              — admin address (defaults to deployer)
 *
 * Deploy:
 *   FOUNDRY_PROFILE=cycle1 forge script contracts/script/harvester/DeployCycle1.s.sol:DeployCycle1 \
 *     --rpc-url https://api.mainnet.abs.xyz \
 *     --private-key $ETH_PRIVATE_KEY \
 *     --broadcast
 */
contract DeployCycle1 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("ETH_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address magic          = vm.envOr("MAGIC_TOKEN",       address(0));
        address masterOfCoin   = vm.envOr("MASTER_OF_COIN",    address(0));
        address atlasMine      = vm.envOr("ATLAS_MINE",        address(0));
        address corruptionTok  = vm.envOr("CORRUPTION_TOKEN",  address(0));
        address admin          = vm.envOr("ADMIN",             deployer);

        vm.startBroadcast(deployerKey);

        // 1. Deploy upgradeable implementation contracts (no init args)
        Harvester harvesterImpl = new Harvester();
        console2.log("Harvester impl:     ", address(harvesterImpl));

        NftHandler nftHandlerImpl = new NftHandler();
        console2.log("NftHandler impl:    ", address(nftHandlerImpl));

        // 2. Deploy HarvesterFactory with placeholder middleman (set after)
        HarvesterFactory factory = new HarvesterFactory(
            IERC20(magic),
            IMiddleman(address(0)),
            admin,
            address(harvesterImpl),
            address(nftHandlerImpl)
        );
        console2.log("HarvesterFactory:   ", address(factory));

        // 3. Deploy Middleman with real factory address
        Middleman middleman = new Middleman(
            admin,
            IMasterOfCoin(masterOfCoin),
            IHarvesterFactory(address(factory)),
            atlasMine,
            1e18,           // atlasMineBoost: 1x — adjust post-deploy
            IERC20(corruptionTok)
        );
        console2.log("Middleman:          ", address(middleman));

        // 4. Wire middleman into factory
        factory.setMiddleman(IMiddleman(address(middleman)));
        console2.log("Middleman set on factory.");

        vm.stopBroadcast();

        console2.log("Cycle 1 deployed by:", deployer);
        console2.log("Next: deploy MasterOfCoin, configure staking rules, then call factory.deployHarvester()");
    }
}
