// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibFishFrenzyStorage } from "./LibFishFrenzyStorage.sol";

/**
 * FishFrenzyFacet — casting, cooldowns, tournament management.
 */
contract FishFrenzyFacet {
    event RodNFTSet(address nft);
    event FishTokenSet(address token);
    event Cast(address indexed angler, uint256 rodId, uint256 score);
    event TournamentStarted(uint256 start, uint256 end, uint256 prize);
    event TournamentWon(address indexed winner, uint256 score, uint256 prize);
    event CooldownSet(uint256 seconds_);
    event BaseCatchRateSet(uint256 rate);

    uint256 private constant BPS = 1e4;

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier notPaused() {
        LibSharedStorage.requireNotPaused();
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setFishFrenzyContracts(address _rodNFT, address _fishToken) external onlyAdmin {
        LibFishFrenzyStorage.Storage storage s = LibFishFrenzyStorage.layout();
        s.rodNFT    = _rodNFT;
        s.fishToken = _fishToken;
        emit RodNFTSet(_rodNFT);
        emit FishTokenSet(_fishToken);
    }

    function setCastCooldown(uint256 _seconds) external onlyAdmin {
        LibFishFrenzyStorage.layout().castCooldown = _seconds;
        emit CooldownSet(_seconds);
    }

    function setBaseCatchRate(uint256 _rate) external onlyAdmin {
        require(_rate <= BPS, "FishFrenzy: rate > 100%");
        LibFishFrenzyStorage.layout().baseCatchRate = _rate;
        emit BaseCatchRateSet(_rate);
    }

    function mintRod(
        uint256 _rodId,
        LibFishFrenzyStorage.RodRarity _rarity,
        uint16 _luckBonus,
        uint16 _durability
    ) external onlyAdmin {
        LibFishFrenzyStorage.layout().rods[_rodId] = LibFishFrenzyStorage.Rod({
            rarity:     _rarity,
            luckBonus:  _luckBonus,
            durability: _durability,
            castsUsed:  0
        });
    }

    function startTournament(uint256 _duration, uint256 _prize) external onlyAdmin {
        LibFishFrenzyStorage.Storage storage s = LibFishFrenzyStorage.layout();
        require(block.timestamp > s.currentTournament.endTime, "FishFrenzy: tournament active");
        s.currentTournament = LibFishFrenzyStorage.Tournament({
            startTime:  block.timestamp,
            endTime:    block.timestamp + _duration,
            prizePool:  _prize,
            topAngler:  address(0),
            topScore:   0
        });
        emit TournamentStarted(block.timestamp, block.timestamp + _duration, _prize);
    }

    // ── Player ────────────────────────────────────────────────────────────────

    function cast(uint256 _rodId) external notPaused returns (uint256 score) {
        LibFishFrenzyStorage.Storage storage s = LibFishFrenzyStorage.layout();
        require(
            block.timestamp >= s.lastCastTime[msg.sender] + s.castCooldown,
            "FishFrenzy: cooldown"
        );

        LibFishFrenzyStorage.Rod storage rod = s.rods[_rodId];
        require(rod.durability > rod.castsUsed, "FishFrenzy: rod broken");
        rod.castsUsed++;
        s.lastCastTime[msg.sender] = block.timestamp;

        uint256 effectiveRate = s.baseCatchRate + rod.luckBonus;
        if (effectiveRate > BPS) effectiveRate = BPS;

        // Pseudo-random score — replace with VRF in production
        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.prevrandao, msg.sender, _rodId, block.timestamp
        ))) % BPS;

        score = rand < effectiveRate ? (rand + rod.luckBonus) : 0;

        s.season_score[msg.sender] += score;

        if (score > s.currentTournament.topScore &&
            block.timestamp <= s.currentTournament.endTime)
        {
            s.currentTournament.topAngler = msg.sender;
            s.currentTournament.topScore  = score;
        }

        emit Cast(msg.sender, _rodId, score);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getSeasonScore(address _angler) external view returns (uint256) {
        return LibFishFrenzyStorage.layout().season_score[_angler];
    }

    function getCurrentTournament()
        external view returns (LibFishFrenzyStorage.Tournament memory)
    {
        return LibFishFrenzyStorage.layout().currentTournament;
    }

    function getRod(uint256 _rodId) external view returns (LibFishFrenzyStorage.Rod memory) {
        return LibFishFrenzyStorage.layout().rods[_rodId];
    }
}
