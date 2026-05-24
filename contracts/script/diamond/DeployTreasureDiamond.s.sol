// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import { TreasureDiamond }    from "../../diamond/TreasureDiamond.sol";
import { DiamondCutFacet }    from "../../diamond/DiamondCutFacet.sol";
import { DiamondLoupeFacet }  from "../../diamond/DiamondLoupeFacet.sol";
import { IDiamondCut }        from "../../diamond/IDiamondCut.sol";
import { LibDiamond }         from "../../diamond/LibDiamond.sol";

import { AdminFacet }         from "../../facets/shared/AdminFacet.sol";
import { HarvesterFacet }     from "../../facets/harvester/HarvesterFacet.sol";
import { LegionFacet }        from "../../facets/legion/LegionFacet.sol";
import { GolemFacet }         from "../../facets/golem/GolemFacet.sol";
import { ArmyGirlsFacet }     from "../../facets/armygirls/ArmyGirlsFacet.sol";
import { FishFrenzyFacet }    from "../../facets/fishfrenzy/FishFrenzyFacet.sol";

/*
 * Deploy TreasureDiamond with all Cycle-1 facets.
 *
 *   DEPLOYER : 0x3336F936486A8FE4bC7E0B491c60c1220EF247c7  (MetaMask / theos[at]bridgeworld.lol Google SSO)
 *   OWNER    : Safe 0x51a2bFd2B391413952b206F1902693C46894e6cE  (base: or abs:)
 *   MAGIC    : chain-specific, pass via env MAGIC_TOKEN
 *   TREASURY : pass via env TREASURY (defaults to OWNER)
 *
 * Run:
 *   FOUNDRY_PROFILE=diamond forge script contracts/script/diamond/DeployTreasureDiamond.s.sol \
 *     --rpc-url abstract --broadcast
 */
contract DeployTreasureDiamond is Script {
    address constant SAFE = 0x51a2bFd2B391413952b206F1902693C46894e6cE;

    function run() external {
        uint256 key      = vm.envOr("ETH_PRIVATE_KEY", uint256(0));
        address deployer = key != 0 ? vm.addr(key) : msg.sender;
        address magic    = vm.envOr("MAGIC_TOKEN",  address(0));
        address treasury = vm.envOr("TREASURY",     SAFE);
        address owner    = vm.envOr("DIAMOND_OWNER", SAFE);

        if (key != 0) { vm.startBroadcast(key); } else { vm.startBroadcast(); }

        // 1. Deploy facet implementations
        DiamondCutFacet   cut      = new DiamondCutFacet();
        DiamondLoupeFacet loupe    = new DiamondLoupeFacet();
        AdminFacet        admin    = new AdminFacet();
        HarvesterFacet    harvester = new HarvesterFacet();
        LegionFacet       legion   = new LegionFacet();
        GolemFacet        golem    = new GolemFacet();
        ArmyGirlsFacet   army     = new ArmyGirlsFacet();
        FishFrenzyFacet   fish     = new FishFrenzyFacet();

        console2.log("DiamondCutFacet:  ", address(cut));
        console2.log("DiamondLoupeFacet:", address(loupe));
        console2.log("AdminFacet:       ", address(admin));
        console2.log("HarvesterFacet:   ", address(harvester));
        console2.log("LegionFacet:      ", address(legion));
        console2.log("GolemFacet:       ", address(golem));
        console2.log("ArmyGirlsFacet:   ", address(army));
        console2.log("FishFrenzyFacet:  ", address(fish));

        // 2. Build FacetCut array
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](8);

        cuts[0] = _cut(address(cut),       _sels(cut));
        cuts[1] = _cut(address(loupe),     _sels(loupe));
        cuts[2] = _cut(address(admin),     _sels(admin));
        cuts[3] = _cut(address(harvester), _sels(harvester));
        cuts[4] = _cut(address(legion),    _sels(legion));
        cuts[5] = _cut(address(golem),     _sels(golem));
        cuts[6] = _cut(address(army),      _sels(army));
        cuts[7] = _cut(address(fish),      _sels(fish));

        // 3. Encode AdminFacet.initAdmin() as initialization calldata
        TreasureDiamond.Initialization[] memory inits = new TreasureDiamond.Initialization[](1);
        inits[0] = TreasureDiamond.Initialization({
            initContract: address(admin),
            initData: abi.encodeWithSelector(
                AdminFacet.initAdmin.selector,
                magic,
                treasury,
                SAFE
            )
        });

        // 4. Deploy diamond — deployer broadcasts, Safe is owner
        TreasureDiamond diamond = new TreasureDiamond(owner, cuts, inits);
        console2.log("TreasureDiamond:  ", address(diamond));
        console2.log("Owner:            ", owner);
        console2.log("Deployer:         ", deployer);

        vm.stopBroadcast();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _cut(address facet, bytes4[] memory sels)
        internal pure returns (IDiamondCut.FacetCut memory)
    {
        return IDiamondCut.FacetCut({
            facetAddress:      facet,
            action:            IDiamondCut.FacetCutAction.Add,
            functionSelectors: sels
        });
    }

    function _sels(DiamondCutFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](1);
        s[0] = DiamondCutFacet.diamondCut.selector;
    }

    function _sels(DiamondLoupeFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = DiamondLoupeFacet.facets.selector;
        s[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        s[2] = DiamondLoupeFacet.facetAddresses.selector;
        s[3] = DiamondLoupeFacet.facetAddress.selector;
        s[4] = DiamondLoupeFacet.supportsInterface.selector;
    }

    function _sels(AdminFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](9);
        s[0] = AdminFacet.initAdmin.selector;
        s[1] = AdminFacet.pause.selector;
        s[2] = AdminFacet.unpause.selector;
        s[3] = AdminFacet.isPaused.selector;
        s[4] = AdminFacet.grantRole.selector;
        s[5] = AdminFacet.revokeRole.selector;
        s[6] = AdminFacet.hasRole.selector;
        s[7] = AdminFacet.setMagic.selector;
        s[8] = AdminFacet.setTreasury.selector;
    }

    function _sels(HarvesterFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](6);
        s[0] = HarvesterFacet.setHarvesterContracts.selector;
        s[1] = HarvesterFacet.registerHarvester.selector;
        s[2] = HarvesterFacet.deactivateHarvester.selector;
        s[3] = HarvesterFacet.getHarvesterFactory.selector;
        s[4] = HarvesterFacet.getAllHarvesters.selector;
        s[5] = HarvesterFacet.getHarvesterInfo.selector;
    }

    function _sels(LegionFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](7);
        s[0] = LegionFacet.setLegionContracts.selector;
        s[1] = LegionFacet.setLegionMetadata.selector;
        s[2] = LegionFacet.grantXP.selector;
        s[3] = LegionFacet.recordStake.selector;
        s[4] = LegionFacet.getLegionMeta.selector;
        s[5] = LegionFacet.getLegionStake.selector;
        s[6] = LegionFacet.getStakedByOwner.selector;
    }

    function _sels(GolemFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = GolemFacet.setGolemContracts.selector;
        s[1] = GolemFacet.mintGolemStats.selector;
        s[2] = GolemFacet.setArenaSeason.selector;
        s[3] = GolemFacet.recordBattle.selector;
        s[4] = GolemFacet.getGolemStats.selector;
    }

    function _sels(ArmyGirlsFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](6);
        s[0] = ArmyGirlsFacet.setArmyGirlsContracts.selector;
        s[1] = ArmyGirlsFacet.setGlobalRewardRate.selector;
        s[2] = ArmyGirlsFacet.mintCharacter.selector;
        s[3] = ArmyGirlsFacet.deploySquad.selector;
        s[4] = ArmyGirlsFacet.recallSquad.selector;
        s[5] = ArmyGirlsFacet.getActiveSquad.selector;
    }

    function _sels(FishFrenzyFacet) internal pure returns (bytes4[] memory s) {
        s = new bytes4[](9);
        s[0] = FishFrenzyFacet.setFishFrenzyContracts.selector;
        s[1] = FishFrenzyFacet.setCastCooldown.selector;
        s[2] = FishFrenzyFacet.setBaseCatchRate.selector;
        s[3] = FishFrenzyFacet.mintRod.selector;
        s[4] = FishFrenzyFacet.startTournament.selector;
        s[5] = FishFrenzyFacet.cast.selector;
        s[6] = FishFrenzyFacet.getSeasonScore.selector;
        s[7] = FishFrenzyFacet.getCurrentTournament.selector;
        s[8] = FishFrenzyFacet.getRod.selector;
    }
}
