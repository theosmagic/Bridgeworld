// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Golem facet storage — NFT state, crafting components, and arena records.
 * Slot: keccak256("treasure.diamond.golem.storage") - 1
 */
library LibGolemStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.golem.storage"))) - 1);

    enum GolemClass { Stone, Iron, Gold, Crystal, Void }

    struct GolemStats {
        GolemClass  class;
        uint16      power;
        uint16      defense;
        uint16      speed;
        uint32      wins;
        uint32      losses;
    }

    struct Storage {
        address golemNFT;
        address componentToken;     // ERC1155 crafting materials

        mapping(uint256 => GolemStats) stats;
        mapping(address => uint256[])  owned;

        uint256 totalMinted;
        uint256 arenaSeasonEnd;
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
