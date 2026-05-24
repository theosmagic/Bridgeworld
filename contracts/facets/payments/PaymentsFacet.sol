// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage }  from "../shared/LibSharedStorage.sol";
import { LibPaymentsStorage } from "./LibPaymentsStorage.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * PaymentsFacet (Mem 𐡌) — configurable payment-split router.
 *
 * The admin sets recipients + shares (basis-point slices of totalShares).
 * Anyone can call distributePayment() to sweep a token balance into per-recipient
 * accrued buckets. Recipients withdraw their own balance with withdraw().
 */
contract PaymentsFacet {
    event RecipientsSet(address[] recipients, uint256[] shares);
    event PaymentDistributed(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setPaymentRecipients(
        address[] calldata recipients,
        uint256[] calldata shares
    ) external onlyAdmin {
        require(recipients.length == shares.length, "PaymentsFacet: length mismatch");
        require(recipients.length > 0, "PaymentsFacet: empty");

        LibPaymentsStorage.Storage storage s = LibPaymentsStorage.layout();
        s.recipients = recipients;
        s.shares     = shares;

        uint256 total;
        for (uint256 i; i < shares.length; i++) total += shares[i];
        s.totalShares = total;

        emit RecipientsSet(recipients, shares);
    }

    // ── Distribution ──────────────────────────────────────────────────────────

    function distributePayment(address token) external {
        LibPaymentsStorage.Storage storage s = LibPaymentsStorage.layout();
        require(s.totalShares > 0, "PaymentsFacet: no recipients");

        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "PaymentsFacet: nothing to distribute");

        for (uint256 i; i < s.recipients.length; i++) {
            uint256 share = (balance * s.shares[i]) / s.totalShares;
            s.accrued[token][s.recipients[i]] += share;
        }

        emit PaymentDistributed(token, balance);
    }

    function withdraw(address token) external {
        LibPaymentsStorage.Storage storage s = LibPaymentsStorage.layout();
        uint256 amount = s.accrued[token][msg.sender];
        require(amount > 0, "PaymentsFacet: nothing owed");

        s.accrued[token][msg.sender] = 0;
        IERC20(token).transfer(msg.sender, amount);

        emit Withdrawn(token, msg.sender, amount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getPaymentRecipients() external view returns (address[] memory, uint256[] memory) {
        LibPaymentsStorage.Storage storage s = LibPaymentsStorage.layout();
        return (s.recipients, s.shares);
    }

    function accruedBalance(address token, address recipient) external view returns (uint256) {
        return LibPaymentsStorage.layout().accrued[token][recipient];
    }
}
