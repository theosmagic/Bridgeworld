// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Harvester facet storage — beacon proxies live here.
 * Slot: keccak256("treasure.diamond.harvester.storage") - 1
 */
library LibHarvesterStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.harvester.storage"))) - 1);

    struct HarvesterInfo {
        address proxy;
        address nftHandler;
        bool    active;
    }

    struct Storage {
        address factory;
        address middleman;
        address harvesterImpl;
        address nftHandlerImpl;

        address[] allHarvesters;
        mapping(address => HarvesterInfo) harvesterInfo;
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
