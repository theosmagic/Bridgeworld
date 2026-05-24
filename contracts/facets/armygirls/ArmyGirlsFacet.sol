// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibArmyGirlsStorage } from "./LibArmyGirlsStorage.sol";

/**
 * ArmyGirlsFacet — character roster, squad deployment, and MAGIC reward distribution.
 */
contract ArmyGirlsFacet {
    event ArmyGirlsNFTSet(address nft);
    event SquadDeployed(address indexed commander, uint256[] tokenIds, uint256 missionEnd);
    event SquadRecalled(address indexed commander, uint256 reward);
    event CharacterRankUp(uint256 indexed tokenId, LibArmyGirlsStorage.Rank newRank);
    event GlobalRewardRateSet(uint256 rate);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier notPaused() {
        LibSharedStorage.requireNotPaused();
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setArmyGirlsContracts(address _nft, address _missionController)
        external onlyAdmin
    {
        LibArmyGirlsStorage.Storage storage s = LibArmyGirlsStorage.layout();
        s.armyGirlsNFT       = _nft;
        s.missionController  = _missionController;
        emit ArmyGirlsNFTSet(_nft);
    }

    function setGlobalRewardRate(uint256 _rate) external onlyAdmin {
        LibArmyGirlsStorage.layout().globalRewardRate = _rate;
        emit GlobalRewardRateSet(_rate);
    }

    function mintCharacter(uint256 _tokenId, uint16 _power, uint16 _loyalty)
        external onlyAdmin
    {
        LibArmyGirlsStorage.layout().characters[_tokenId] = LibArmyGirlsStorage.Character({
            rank:               0,
            power:              _power,
            loyalty:            _loyalty,
            missionsCompleted:  0,
            lastMissionEnd:     0
        });
    }

    // ── Player ────────────────────────────────────────────────────────────────

    function deploySquad(uint256[] calldata _tokenIds, uint256 _missionDuration)
        external
        notPaused
    {
        LibArmyGirlsStorage.Storage storage s = LibArmyGirlsStorage.layout();
        require(!s.activeSquad[msg.sender].active, "ArmyGirls: squad already deployed");
        require(_tokenIds.length > 0 && _tokenIds.length <= 5, "ArmyGirls: 1-5 characters");

        uint256 totalPower;
        for (uint256 i; i < _tokenIds.length; i++) {
            totalPower += s.characters[_tokenIds[i]].power;
        }

        uint256 end = block.timestamp + _missionDuration;
        uint256 reward = totalPower * s.globalRewardRate * _missionDuration / 1e18;

        s.activeSquad[msg.sender] = LibArmyGirlsStorage.Squad({
            tokenIds:   _tokenIds,
            missionEnd: end,
            rewardPool: reward,
            active:     true
        });

        emit SquadDeployed(msg.sender, _tokenIds, end);
    }

    function recallSquad() external notPaused {
        LibArmyGirlsStorage.Storage storage s = LibArmyGirlsStorage.layout();
        LibArmyGirlsStorage.Squad storage squad = s.activeSquad[msg.sender];
        require(squad.active, "ArmyGirls: no active squad");
        require(block.timestamp >= squad.missionEnd, "ArmyGirls: mission not complete");

        uint256 reward = squad.rewardPool;
        for (uint256 i; i < squad.tokenIds.length; i++) {
            s.characters[squad.tokenIds[i]].missionsCompleted++;
        }

        squad.active = false;
        squad.rewardPool = 0;

        emit SquadRecalled(msg.sender, reward);
        // MAGIC transfer handled by MissionController; reward amount emitted for off-chain settlement
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getCharacter(uint256 _tokenId)
        external view returns (LibArmyGirlsStorage.Character memory)
    {
        return LibArmyGirlsStorage.layout().characters[_tokenId];
    }

    function getActiveSquad(address _commander)
        external view returns (LibArmyGirlsStorage.Squad memory)
    {
        return LibArmyGirlsStorage.layout().activeSquad[_commander];
    }
}
