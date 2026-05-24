// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibGuildStorage }   from "./LibGuildStorage.sol";

/**
 * GuildFacet (Nun 𐡍) — player guild management.
 *
 * Guild IDs start at 1 (index 0 in the array is a sentinel empty guild).
 * A player can only belong to one guild at a time.
 */
contract GuildFacet {
    event GuildCreated(uint256 indexed guildId, string name, bytes32 tag, address admin);
    event GuildDisbanded(uint256 indexed guildId);
    event MemberJoined(uint256 indexed guildId, address indexed member);
    event MemberLeft(uint256 indexed guildId, address indexed member);
    event MemberKicked(uint256 indexed guildId, address indexed member, address by);
    event GuildAdminSet(uint256 indexed guildId, address indexed newAdmin);

    modifier notPaused() {
        LibSharedStorage.requireNotPaused();
        _;
    }

    modifier onlyGuildAdmin(uint256 guildId) {
        LibGuildStorage.Guild storage g = LibGuildStorage.layout().guilds[guildId];
        require(g.active, "GuildFacet: disbanded");
        require(g.admin == msg.sender, "GuildFacet: not guild admin");
        _;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    function createGuild(string calldata name, bytes32 tag)
        external
        notPaused
        returns (uint256 guildId)
    {
        LibGuildStorage.Storage storage s = LibGuildStorage.layout();

        // Seed sentinel on first call
        if (s.guilds.length == 0) {
            s.guilds.push(); // index 0 = sentinel
        }

        guildId = s.guilds.length;
        s.guilds.push();
        LibGuildStorage.Guild storage g = s.guilds[guildId];
        g.name        = name;
        g.tag         = tag;
        g.admin       = msg.sender;
        g.memberCount = 1;
        g.active      = true;

        s.memberGuild[msg.sender] = guildId;
        emit GuildCreated(guildId, name, tag, msg.sender);
    }

    function disbandGuild(uint256 guildId) external onlyGuildAdmin(guildId) {
        LibGuildStorage.layout().guilds[guildId].active = false;
        emit GuildDisbanded(guildId);
    }

    // ── Membership ────────────────────────────────────────────────────────────

    function joinGuild(uint256 guildId) external notPaused {
        LibGuildStorage.Storage storage s = LibGuildStorage.layout();
        require(guildId < s.guilds.length, "GuildFacet: invalid id");
        require(s.guilds[guildId].active, "GuildFacet: disbanded");
        require(s.memberGuild[msg.sender] == 0, "GuildFacet: already in a guild");

        s.guilds[guildId].memberCount++;
        s.memberGuild[msg.sender] = guildId;
        emit MemberJoined(guildId, msg.sender);
    }

    function leaveGuild() external notPaused {
        LibGuildStorage.Storage storage s = LibGuildStorage.layout();
        uint256 guildId = s.memberGuild[msg.sender];
        require(guildId != 0, "GuildFacet: not in a guild");
        require(s.guilds[guildId].admin != msg.sender, "GuildFacet: admin must transfer first");

        s.guilds[guildId].memberCount--;
        s.memberGuild[msg.sender] = 0;
        emit MemberLeft(guildId, msg.sender);
    }

    function kickMember(uint256 guildId, address member) external onlyGuildAdmin(guildId) {
        LibGuildStorage.Storage storage s = LibGuildStorage.layout();
        require(s.memberGuild[member] == guildId, "GuildFacet: not a member");
        require(member != msg.sender, "GuildFacet: can't kick self");

        s.guilds[guildId].memberCount--;
        s.memberGuild[member] = 0;
        emit MemberKicked(guildId, member, msg.sender);
    }

    function setGuildAdmin(uint256 guildId, address newAdmin) external onlyGuildAdmin(guildId) {
        require(newAdmin != address(0), "GuildFacet: zero address");
        LibGuildStorage.layout().guilds[guildId].admin = newAdmin;
        emit GuildAdminSet(guildId, newAdmin);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getGuild(uint256 guildId)
        external view
        returns (string memory name, bytes32 tag, address admin, uint256 memberCount, bool active)
    {
        LibGuildStorage.Guild storage g = LibGuildStorage.layout().guilds[guildId];
        return (g.name, g.tag, g.admin, g.memberCount, g.active);
    }

    function getGuildOf(address member) external view returns (uint256) {
        return LibGuildStorage.layout().memberGuild[member];
    }

    function guildCount() external view returns (uint256) {
        uint256 len = LibGuildStorage.layout().guilds.length;
        return len > 0 ? len - 1 : 0; // subtract sentinel
    }
}
