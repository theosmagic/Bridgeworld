// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import { IDiamondCut }           from "../../diamond/IDiamondCut.sol";

import { OwnershipFacet }        from "../../facets/access/OwnershipFacet.sol";
import { AccessControlFacet }    from "../../facets/access/AccessControlFacet.sol";
import { MetaTxFacet }           from "../../facets/metatx/MetaTxFacet.sol";
import { OrganizationFacet }     from "../../facets/organizations/OrganizationFacet.sol";
import { PaymentsFacet }         from "../../facets/payments/PaymentsFacet.sol";
import { GuildFacet }            from "../../facets/guilds/GuildFacet.sol";
import { CraftingFacet }         from "../../facets/crafting/CraftingFacet.sol";

/*
 * AddFacets — Deploy Cycle-2 facets (slots 9-15, glyphs Teth→Samekh) and
 * output the Safe diamondCut transaction.
 *
 * DIAMOND  = 0xAb054975Fe7bDE67e22Af347B7b776Cd36294971  (Abstract mainnet 2741)
 * OWNER    = Safe 0x51a2bFd2B391413952b206F1902693C46894e6cE
 *
 * Run (deploy facets, dry-run):
 *   FOUNDRY_PROFILE=diamond forge script contracts/script/diamond/AddFacets.s.sol \
 *     --rpc-url abstract
 *
 * Run (broadcast — deploys implementation contracts only, NOT diamondCut):
 *   FOUNDRY_PROFILE=diamond forge script contracts/script/diamond/AddFacets.s.sol \
 *     --rpc-url abstract --broadcast
 *
 * Then submit safe-tx/add-facets-cycle2.json to:
 *   https://app.safe.global/transactions/queue?safe=abs:0x51a2bFd2B391413952b206F1902693C46894e6cE
 */
contract AddFacets is Script {
    address constant DIAMOND = 0xAb054975Fe7bDE67e22Af347B7b776Cd36294971;
    address constant SAFE    = 0x51a2bFd2B391413952b206F1902693C46894e6cE;

    function run() external {
        uint256 key = vm.envOr("ETH_PRIVATE_KEY", uint256(0));
        if (key != 0) { vm.startBroadcast(key); } else { vm.startBroadcast(); }

        // ── 1. Deploy facet implementations ───────────────────────────────────
        OwnershipFacet      ownership  = new OwnershipFacet();
        AccessControlFacet  acl        = new AccessControlFacet();
        MetaTxFacet         metatx     = new MetaTxFacet();
        OrganizationFacet   orgs       = new OrganizationFacet();
        PaymentsFacet       payments   = new PaymentsFacet();
        GuildFacet          guilds     = new GuildFacet();
        CraftingFacet       crafting   = new CraftingFacet();

        vm.stopBroadcast();

        console2.log("=== Cycle-2 Facet Deployments ===");
        console2.log("OwnershipFacet     (Teth  D9) :", address(ownership));
        console2.log("AccessControlFacet (Yod  D10) :", address(acl));
        console2.log("MetaTxFacet        (Kaph D11) :", address(metatx));
        console2.log("OrganizationFacet  (Lamed D12):", address(orgs));
        console2.log("PaymentsFacet      (Mem  D13) :", address(payments));
        console2.log("GuildFacet         (Nun  D14) :", address(guilds));
        console2.log("CraftingFacet      (Samekh D15):", address(crafting));

        // ── 2. Build FacetCut array ────────────────────────────────────────────
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](7);

        cuts[0] = _cut(address(ownership),  _sels_ownership());
        cuts[1] = _cut(address(acl),        _sels_acl());
        cuts[2] = _cut(address(metatx),     _sels_metatx());
        cuts[3] = _cut(address(orgs),       _sels_orgs());
        cuts[4] = _cut(address(payments),   _sels_payments());
        cuts[5] = _cut(address(guilds),     _sels_guilds());
        cuts[6] = _cut(address(crafting),   _sels_crafting());

        // ── 3. Encode diamondCut calldata ────────────────────────────────────
        bytes memory callData = abi.encodeWithSelector(
            IDiamondCut.diamondCut.selector,
            cuts,
            address(0),
            bytes("")
        );

        console2.log("\n=== Safe diamondCut calldata ===");
        console2.logBytes(callData);

        // ── 4. Write Safe batch tx JSON ───────────────────────────────────────
        string memory calldataHex = vm.toString(callData);
        string memory json = string.concat(
            '{"version":"1.0","chainId":"2741","meta":{"name":"Add Cycle-2 Facets (Teth-Samekh)","description":"Wire in 7 new facets: Ownership, AccessControl, MetaTx, Organization, Payments, Guild, Crafting","txBuilderVersion":"1.16.5","createdFromSafeAddress":"',
            vm.toString(SAFE),
            '"},"transactions":[{"to":"',
            vm.toString(DIAMOND),
            '","value":"0","data":"',
            calldataHex,
            '"}]}'
        );
        vm.writeFile("safe-tx/add-facets-cycle2.json", json);
        console2.log("\nSafe tx written to: safe-tx/add-facets-cycle2.json");
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

    function _sels_ownership() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](3);
        s[0] = OwnershipFacet.owner.selector;
        s[1] = OwnershipFacet.transferOwnership.selector;
        s[2] = OwnershipFacet.renounceOwnership.selector;
    }

    function _sels_acl() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](7);
        s[0] = bytes4(keccak256("DEFAULT_ADMIN_ROLE()"));
        s[1] = AccessControlFacet.ADMIN_ROLE.selector;
        s[2] = AccessControlFacet.PAUSER_ROLE.selector;
        s[3] = AccessControlFacet.OPERATOR_ROLE.selector;
        s[4] = AccessControlFacet.getRoleAdmin.selector;
        s[5] = AccessControlFacet.setRoleAdmin.selector;
        s[6] = AccessControlFacet.renounceRole.selector;
    }

    function _sels_metatx() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](4);
        s[0] = MetaTxFacet.setTrustedForwarder.selector;
        s[1] = MetaTxFacet.setPrimaryForwarder.selector;
        s[2] = MetaTxFacet.isTrustedForwarder.selector;
        s[3] = MetaTxFacet.trustedForwarder.selector;
    }

    function _sels_orgs() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](7);
        s[0] = OrganizationFacet.createOrg.selector;
        s[1] = OrganizationFacet.setOrgAdmin.selector;
        s[2] = OrganizationFacet.addOrgMember.selector;
        s[3] = OrganizationFacet.removeOrgMember.selector;
        s[4] = OrganizationFacet.isOrgMember.selector;
        s[5] = OrganizationFacet.getOrgAdmin.selector;
        s[6] = OrganizationFacet.getOrgName.selector;
    }

    function _sels_payments() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = PaymentsFacet.setPaymentRecipients.selector;
        s[1] = PaymentsFacet.distributePayment.selector;
        s[2] = PaymentsFacet.withdraw.selector;
        s[3] = PaymentsFacet.getPaymentRecipients.selector;
        s[4] = PaymentsFacet.accruedBalance.selector;
    }

    function _sels_guilds() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](8);
        s[0] = GuildFacet.createGuild.selector;
        s[1] = GuildFacet.disbandGuild.selector;
        s[2] = GuildFacet.joinGuild.selector;
        s[3] = GuildFacet.leaveGuild.selector;
        s[4] = GuildFacet.kickMember.selector;
        s[5] = GuildFacet.setGuildAdmin.selector;
        s[6] = GuildFacet.getGuild.selector;
        s[7] = GuildFacet.getGuildOf.selector;
    }

    function _sels_crafting() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = CraftingFacet.addRecipe.selector;
        s[1] = CraftingFacet.setRecipeActive.selector;
        s[2] = CraftingFacet.craft.selector;
        s[3] = CraftingFacet.getRecipe.selector;
        s[4] = CraftingFacet.recipeCount.selector;
    }
}
