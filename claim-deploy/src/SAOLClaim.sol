// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title SAOLClaim — Merkle drop for Σ℧ΛΘ (SAOL) token
/// @notice Claimants submit a Merkle proof to receive an allocation of SAOL.
///         Leaf encoding: keccak256(abi.encodePacked(account, amount))
contract SAOLClaim is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable TOKEN;
    bytes32 public immutable ROOT;

    bool public claimOpen;
    mapping(address => bool) private _claimed;

    event Claimed(address indexed account, uint256 amount);
    event ClaimToggled(bool open);
    event Recovered(address indexed token, uint256 amount);

    error ClaimClosed();
    error AlreadyClaimed();
    error InvalidProof();
    error ZeroAmount();

    constructor(address token, bytes32 root, address initialOwner) Ownable(initialOwner) {
        TOKEN = IERC20(token);
        ROOT = root;
        claimOpen = false;
    }

    // ── Admin ───────────────────────────────────────────────────────────────

    function openClaims() external onlyOwner {
        claimOpen = true;
        emit ClaimToggled(true);
    }

    function closeClaims() external onlyOwner {
        claimOpen = false;
        emit ClaimToggled(false);
    }

    /// @notice Recover any ERC-20 (including SAOL after claim period ends).
    function recover(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
        emit Recovered(token, amount);
    }

    // ── View ────────────────────────────────────────────────────────────────

    function hasClaimed(address account) external view returns (bool) {
        return _claimed[account];
    }

    function validateClaim(
        address account,
        uint256 amount,
        bytes32[] calldata proof
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account, amount));
        return MerkleProof.verify(proof, ROOT, leaf);
    }

    // ── Claim ───────────────────────────────────────────────────────────────

    function claim(
        address account,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        if (!claimOpen) revert ClaimClosed();
        if (amount == 0) revert ZeroAmount();
        if (_claimed[account]) revert AlreadyClaimed();
        if (!validateClaim(account, amount, proof)) revert InvalidProof();

        _claimed[account] = true;
        TOKEN.safeTransfer(account, amount);
        emit Claimed(account, amount);
    }
}
