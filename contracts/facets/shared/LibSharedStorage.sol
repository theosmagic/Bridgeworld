// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Shared storage read by all facets — global config and access control.
 * Slot: keccak256("treasure.diamond.shared.storage") - 1
 */
library LibSharedStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.shared.storage"))) - 1);

    struct RoleSet {
        mapping(address => bool) members;
    }

    struct Storage {
        address magic;           // MAGIC token on this chain
        address treasury;        // protocol treasury
        address safeOwner;       // Safe multisig — inherits diamond owner role
        bool    paused;

        mapping(bytes32 => RoleSet) roles;
    }

    bytes32 internal constant ADMIN_ROLE    = keccak256("ADMIN");
    bytes32 internal constant PAUSER_ROLE   = keccak256("PAUSER");
    bytes32 internal constant OPERATOR_ROLE = keccak256("OPERATOR");

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }

    function hasRole(bytes32 role, address account) internal view returns (bool) {
        return layout().roles[role].members[account];
    }

    function requireRole(bytes32 role, address account) internal view {
        require(hasRole(role, account), "LibShared: missing role");
    }

    function requireNotPaused() internal view {
        require(!layout().paused, "LibShared: paused");
    }
}
