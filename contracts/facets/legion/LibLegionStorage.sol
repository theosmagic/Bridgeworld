// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Legion facet storage — staking, metadata, XP.
 * Slot: keccak256("treasure.diamond.legion.storage") - 1
 */
library LibLegionStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.legion.storage"))) - 1);

    enum Generation { Genesis, Auxiliary, Recruit }
    enum Rarity     { Legendary, Rare, Special, Uncommon, Common, Recruit }

    struct LegionMeta {
        Generation  generation;
        Rarity      rarity;
        uint8       questLevel;
        uint8       craftLevel;
        uint256     xp;
    }

    struct StakeInfo {
        address owner;
        uint256 stakedAt;
        uint256 harvesterId;
    }

    struct Storage {
        address legionNFT;
        address metadataStore;

        mapping(uint256 => LegionMeta)  metadata;
        mapping(uint256 => StakeInfo)   stakes;
        mapping(address => uint256[])   stakedByOwner;
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
