// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ArmyGirls facet storage — character roster, squad missions, rewards.
 * Slot: keccak256("treasure.diamond.armygirls.storage") - 1
 */
library LibArmyGirlsStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.armygirls.storage"))) - 1);

    enum Rank { Recruit, Private, Corporal, Sergeant, Lieutenant, Captain }

    struct Character {
        uint8   rank;
        uint16  power;
        uint16  loyalty;
        uint32  missionsCompleted;
        uint256 lastMissionEnd;
    }

    struct Squad {
        uint256[] tokenIds;
        uint256   missionEnd;
        uint256   rewardPool;   // MAGIC wei pending
        bool      active;
    }

    struct Storage {
        address armyGirlsNFT;
        address missionController;

        mapping(uint256 => Character) characters;
        mapping(address => Squad)     activeSquad;

        uint256 totalMissions;
        uint256 globalRewardRate;   // MAGIC per mission per power unit (1e18 scale)
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
