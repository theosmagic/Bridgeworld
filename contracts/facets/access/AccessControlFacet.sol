// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibDiamond }       from "../../diamond/LibDiamond.sol";
import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibAccessStorage } from "./LibAccessStorage.sol";

/**
 * AccessControlFacet (Yod 𐡉) — role-admin extension on top of AdminFacet.
 *
 * AdminFacet already exposes grantRole / revokeRole / hasRole.
 * This facet adds: role constants, renounceRole, and role-admin wiring
 * so that roles can delegate their own management without diamond owner.
 */
contract AccessControlFacet {
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleRenounced(bytes32 indexed role, address indexed account);

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    // ── Role constants (convenience readers) ──────────────────────────────────

    function ADMIN_ROLE()    external pure returns (bytes32) { return LibSharedStorage.ADMIN_ROLE; }
    function PAUSER_ROLE()   external pure returns (bytes32) { return LibSharedStorage.PAUSER_ROLE; }
    function OPERATOR_ROLE() external pure returns (bytes32) { return LibSharedStorage.OPERATOR_ROLE; }

    // ── Role-admin management ─────────────────────────────────────────────────

    function getRoleAdmin(bytes32 role) external view returns (bytes32) {
        return LibAccessStorage.layout().roleAdmin[role];
    }

    function setRoleAdmin(bytes32 role, bytes32 adminRole) external onlyOwner {
        bytes32 prev = LibAccessStorage.layout().roleAdmin[role];
        LibAccessStorage.layout().roleAdmin[role] = adminRole;
        emit RoleAdminChanged(role, prev, adminRole);
    }

    // ── Self-service renounce ─────────────────────────────────────────────────

    function renounceRole(bytes32 role) external {
        LibSharedStorage.layout().roles[role].members[msg.sender] = false;
        emit RoleRenounced(role, msg.sender);
    }
}
