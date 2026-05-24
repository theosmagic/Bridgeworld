// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * EIP-2771 meta-transaction storage — trusted forwarder registry.
 * Slot: keccak256("treasure.diamond.metatx.storage") - 1
 */
library LibMetaTxStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.metatx.storage"))) - 1);

    struct Storage {
        mapping(address => bool) trustedForwarders;
        address primaryForwarder; // convenience getter for the canonical forwarder
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
