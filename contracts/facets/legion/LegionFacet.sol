// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibLegionStorage } from "./LibLegionStorage.sol";

/**
 * LegionFacet — Legion NFT metadata registry and staking book-keeping.
 * Staking calls are forwarded to individual Harvester proxies;
 * this facet records who staked where for the UI/subgraph layer.
 */
contract LegionFacet {
    event LegionNFTSet(address nft);
    event MetadataStoreSet(address store);
    event LegionStaked(uint256 indexed tokenId, address indexed owner, uint256 harvesterId);
    event LegionUnstaked(uint256 indexed tokenId, address indexed owner);
    event XPGranted(uint256 indexed tokenId, uint256 amount);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier notPaused() {
        LibSharedStorage.requireNotPaused();
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setLegionContracts(address _nft, address _metadataStore) external onlyAdmin {
        LibLegionStorage.Storage storage s = LibLegionStorage.layout();
        s.legionNFT      = _nft;
        s.metadataStore  = _metadataStore;
        emit LegionNFTSet(_nft);
        emit MetadataStoreSet(_metadataStore);
    }

    function setLegionMetadata(
        uint256 _tokenId,
        LibLegionStorage.Generation _gen,
        LibLegionStorage.Rarity     _rarity,
        uint8 _questLevel,
        uint8 _craftLevel
    ) external onlyAdmin {
        LibLegionStorage.layout().metadata[_tokenId] = LibLegionStorage.LegionMeta({
            generation:  _gen,
            rarity:      _rarity,
            questLevel:  _questLevel,
            craftLevel:  _craftLevel,
            xp:          0
        });
    }

    function grantXP(uint256 _tokenId, uint256 _amount) external onlyAdmin {
        LibLegionStorage.layout().metadata[_tokenId].xp += _amount;
        emit XPGranted(_tokenId, _amount);
    }

    // ── Stake book-keeping (called by Harvester beacon, not end user) ─────────

    function recordStake(uint256 _tokenId, address _owner, uint256 _harvesterId)
        external
        notPaused
    {
        LibSharedStorage.requireRole(LibSharedStorage.OPERATOR_ROLE, msg.sender);
        LibLegionStorage.Storage storage s = LibLegionStorage.layout();
        s.stakes[_tokenId] = LibLegionStorage.StakeInfo({
            owner:       _owner,
            stakedAt:    block.timestamp,
            harvesterId: _harvesterId
        });
        s.stakedByOwner[_owner].push(_tokenId);
        emit LegionStaked(_tokenId, _owner, _harvesterId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getLegionMeta(uint256 _tokenId)
        external view returns (LibLegionStorage.LegionMeta memory)
    {
        return LibLegionStorage.layout().metadata[_tokenId];
    }

    function getLegionStake(uint256 _tokenId)
        external view returns (LibLegionStorage.StakeInfo memory)
    {
        return LibLegionStorage.layout().stakes[_tokenId];
    }

    function getStakedByOwner(address _owner) external view returns (uint256[] memory) {
        return LibLegionStorage.layout().stakedByOwner[_owner];
    }
}
