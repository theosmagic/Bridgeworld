// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibGolemStorage } from "./LibGolemStorage.sol";

/**
 * GolemFacet — Golem NFT stats, crafting socket, and arena records.
 */
contract GolemFacet {
    event GolemNFTSet(address nft);
    event ComponentTokenSet(address token);
    event GolemStatsMinted(uint256 indexed tokenId, LibGolemStorage.GolemClass class_);
    event GolemBattleResult(uint256 indexed tokenId, bool won);
    event ArenaSeasonSet(uint256 endTime);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier notPaused() {
        LibSharedStorage.requireNotPaused();
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setGolemContracts(address _nft, address _componentToken) external onlyAdmin {
        LibGolemStorage.Storage storage s = LibGolemStorage.layout();
        s.golemNFT        = _nft;
        s.componentToken  = _componentToken;
        emit GolemNFTSet(_nft);
        emit ComponentTokenSet(_componentToken);
    }

    function mintGolemStats(
        uint256 _tokenId,
        LibGolemStorage.GolemClass _class,
        uint16 _power,
        uint16 _defense,
        uint16 _speed
    ) external onlyAdmin {
        LibGolemStorage.layout().stats[_tokenId] = LibGolemStorage.GolemStats({
            class:   _class,
            power:   _power,
            defense: _defense,
            speed:   _speed,
            wins:    0,
            losses:  0
        });
        emit GolemStatsMinted(_tokenId, _class);
    }

    function setArenaSeason(uint256 _endTime) external onlyAdmin {
        LibGolemStorage.layout().arenaSeasonEnd = _endTime;
        emit ArenaSeasonSet(_endTime);
    }

    // ── Arena (operator-callable from battle resolver) ────────────────────────

    function recordBattle(uint256 _tokenId, bool _won) external notPaused {
        LibSharedStorage.requireRole(LibSharedStorage.OPERATOR_ROLE, msg.sender);
        LibGolemStorage.GolemStats storage stats = LibGolemStorage.layout().stats[_tokenId];
        if (_won) stats.wins++;
        else      stats.losses++;
        emit GolemBattleResult(_tokenId, _won);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getGolemStats(uint256 _tokenId)
        external view returns (LibGolemStorage.GolemStats memory)
    {
        return LibGolemStorage.layout().stats[_tokenId];
    }

    function getArenaSeasonEnd() external view returns (uint256) {
        return LibGolemStorage.layout().arenaSeasonEnd;
    }
}
