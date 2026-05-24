// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibOrgStorage }     from "./LibOrgStorage.sol";

/**
 * OrganizationFacet (Lamed 𐡋) — on-chain organization registry.
 *
 * Organizations are identified by a bytes32 id (e.g. keccak256("Covenant")).
 * Each org has an admin address and a member set. Only the org admin can
 * add/remove members; the diamond ADMIN_ROLE can create and reassign orgs.
 */
contract OrganizationFacet {
    event OrgCreated(bytes32 indexed id, string name, address admin);
    event OrgAdminSet(bytes32 indexed id, address previousAdmin, address newAdmin);
    event OrgMemberAdded(bytes32 indexed id, address indexed member);
    event OrgMemberRemoved(bytes32 indexed id, address indexed member);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier onlyOrgAdmin(bytes32 id) {
        LibOrgStorage.Storage storage s = LibOrgStorage.layout();
        require(s.orgs[id].exists, "OrgFacet: org not found");
        require(s.orgs[id].admin == msg.sender, "OrgFacet: not org admin");
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function createOrg(bytes32 id, string calldata name, address admin) external onlyAdmin {
        LibOrgStorage.Storage storage s = LibOrgStorage.layout();
        require(!s.orgs[id].exists, "OrgFacet: org exists");
        require(admin != address(0), "OrgFacet: zero admin");
        s.orgs[id].name   = name;
        s.orgs[id].admin  = admin;
        s.orgs[id].exists = true;
        emit OrgCreated(id, name, admin);
    }

    function setOrgAdmin(bytes32 id, address newAdmin) external onlyAdmin {
        LibOrgStorage.Storage storage s = LibOrgStorage.layout();
        require(s.orgs[id].exists, "OrgFacet: org not found");
        require(newAdmin != address(0), "OrgFacet: zero admin");
        address prev = s.orgs[id].admin;
        s.orgs[id].admin = newAdmin;
        emit OrgAdminSet(id, prev, newAdmin);
    }

    // ── Org-admin ─────────────────────────────────────────────────────────────

    function addOrgMember(bytes32 id, address member) external onlyOrgAdmin(id) {
        LibOrgStorage.layout().orgs[id].members[member] = true;
        emit OrgMemberAdded(id, member);
    }

    function removeOrgMember(bytes32 id, address member) external onlyOrgAdmin(id) {
        LibOrgStorage.layout().orgs[id].members[member] = false;
        emit OrgMemberRemoved(id, member);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function isOrgMember(bytes32 id, address member) external view returns (bool) {
        return LibOrgStorage.layout().orgs[id].members[member];
    }

    function getOrgAdmin(bytes32 id) external view returns (address) {
        return LibOrgStorage.layout().orgs[id].admin;
    }

    function getOrgName(bytes32 id) external view returns (string memory) {
        return LibOrgStorage.layout().orgs[id].name;
    }

    function orgExists(bytes32 id) external view returns (bool) {
        return LibOrgStorage.layout().orgs[id].exists;
    }
}
