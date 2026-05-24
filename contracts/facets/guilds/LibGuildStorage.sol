// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Guild registry storage.
 * Slot: keccak256("treasure.diamond.guilds.storage") - 1
 *
 * guilds[0] is a sentinel (never used); guild IDs start at 1.
 * memberGuild[addr] == 0 means no guild.
 */
library LibGuildStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.guilds.storage"))) - 1);

    struct Guild {
        string  name;
        bytes32 tag;        // 4-char identifier, packed as bytes32
        address admin;
        uint256 memberCount;
        bool    active;
    }

    struct Storage {
        Guild[]                    guilds;          // index = guildId (0 = sentinel)
        mapping(address => uint256) memberGuild;    // address => guildId
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
