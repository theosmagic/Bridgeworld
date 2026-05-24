// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Fish Frenzy facet storage — fishing rods, catches, tournament state.
 * Slot: keccak256("treasure.diamond.fishfrenzy.storage") - 1
 */
library LibFishFrenzyStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.fishfrenzy.storage"))) - 1);

    enum RodRarity { Common, Uncommon, Rare, Epic, Legendary }

    struct Rod {
        RodRarity rarity;
        uint16    luckBonus;    // basis points on top of base catch rate
        uint16    durability;   // max casts before repair
        uint16    castsUsed;
    }

    struct Tournament {
        uint256 startTime;
        uint256 endTime;
        uint256 prizePool;      // MAGIC wei
        address topAngler;
        uint256 topScore;
    }

    struct Storage {
        address rodNFT;
        address fishToken;      // ERC20 catch token

        mapping(uint256 => Rod)      rods;
        mapping(address => uint256)  season_score;
        mapping(address => uint256)  lastCastTime;

        Tournament currentTournament;
        uint256    castCooldown;     // seconds between casts
        uint256    baseCatchRate;    // 1e4 = 100%
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
