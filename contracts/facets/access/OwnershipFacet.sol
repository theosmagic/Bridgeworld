// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibDiamond } from "../../diamond/LibDiamond.sol";

/**
 * OwnershipFacet (Teth 𐡈) — EIP-173 ownership surface for TreasureDiamond.
 * Owner is stored in LibDiamond.DiamondStorage; the Safe multisig is the owner.
 */
contract OwnershipFacet {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    function owner() external view returns (address) {
        return LibDiamond.contractOwner();
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "OwnershipFacet: zero address");
        LibDiamond.setContractOwner(_newOwner);
    }

    function renounceOwnership() external onlyOwner {
        LibDiamond.setContractOwner(address(0));
    }
}
