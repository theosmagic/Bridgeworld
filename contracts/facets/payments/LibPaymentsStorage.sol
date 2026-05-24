// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Payment-split storage — configurable recipient shares and per-token accruals.
 * Slot: keccak256("treasure.diamond.payments.storage") - 1
 */
library LibPaymentsStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.payments.storage"))) - 1);

    struct Storage {
        address[] recipients;
        uint256[] shares;      // basis points out of totalShares
        uint256   totalShares;

        // token => recipient => accrued amount not yet withdrawn
        mapping(address => mapping(address => uint256)) accrued;
        // token => total already distributed (for checkpoint accounting)
        mapping(address => uint256) totalDistributed;
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
