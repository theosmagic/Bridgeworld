// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Access-control extension storage — role-admin mapping.
 * Slot: keccak256("treasure.diamond.access.storage") - 1
 */
library LibAccessStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.access.storage"))) - 1);

    struct Storage {
        mapping(bytes32 => bytes32) roleAdmin; // role => its admin role
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
