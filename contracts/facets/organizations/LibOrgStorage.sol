// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Organization registry storage.
 * Slot: keccak256("treasure.diamond.organizations.storage") - 1
 */
library LibOrgStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.organizations.storage"))) - 1);

    struct Org {
        string  name;
        address admin;
        bool    exists;
        mapping(address => bool) members;
    }

    struct Storage {
        mapping(bytes32 => Org) orgs; // orgId => Org
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
