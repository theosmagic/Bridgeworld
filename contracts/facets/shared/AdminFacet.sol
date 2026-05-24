// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibDiamond } from "../../diamond/LibDiamond.sol";
import { LibSharedStorage } from "./LibSharedStorage.sol";

/**
 * AdminFacet — pause, roles, and global config for TreasureDiamond.
 * All state-changing functions require ADMIN_ROLE or diamond owner.
 */
contract AdminFacet {
    event Paused(address by);
    event Unpaused(address by);
    event RoleGranted(bytes32 indexed role, address indexed account, address by);
    event RoleRevoked(bytes32 indexed role, address indexed account, address by);
    event MagicSet(address magic);
    event TreasurySet(address treasury);

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier onlyAdmin() {
        require(
            LibSharedStorage.hasRole(LibSharedStorage.ADMIN_ROLE, msg.sender) ||
            LibDiamond.contractOwner() == msg.sender,
            "AdminFacet: not admin"
        );
        _;
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    function initAdmin(address _magic, address _treasury, address _safe) external {
        LibSharedStorage.Storage storage s = LibSharedStorage.layout();
        require(s.safeOwner == address(0), "AdminFacet: already init");
        s.magic      = _magic;
        s.treasury   = _treasury;
        s.safeOwner  = _safe;
        s.roles[LibSharedStorage.ADMIN_ROLE].members[_safe] = true;
        emit MagicSet(_magic);
        emit TreasurySet(_treasury);
    }

    // ── Pause ─────────────────────────────────────────────────────────────────

    function pause() external onlyAdmin {
        LibSharedStorage.layout().paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyAdmin {
        LibSharedStorage.layout().paused = false;
        emit Unpaused(msg.sender);
    }

    function isPaused() external view returns (bool) {
        return LibSharedStorage.layout().paused;
    }

    // ── Roles ─────────────────────────────────────────────────────────────────

    function grantRole(bytes32 role, address account) external onlyAdmin {
        LibSharedStorage.layout().roles[role].members[account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyAdmin {
        LibSharedStorage.layout().roles[role].members[account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return LibSharedStorage.hasRole(role, account);
    }

    // ── Config ────────────────────────────────────────────────────────────────

    function setMagic(address _magic) external onlyAdmin {
        LibSharedStorage.layout().magic = _magic;
        emit MagicSet(_magic);
    }

    function setTreasury(address _treasury) external onlyAdmin {
        LibSharedStorage.layout().treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    function getMagic() external view returns (address) {
        return LibSharedStorage.layout().magic;
    }

    function getTreasury() external view returns (address) {
        return LibSharedStorage.layout().treasury;
    }
}
