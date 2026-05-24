// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibDiamond } from "./LibDiamond.sol";
import { IDiamondCut } from "./IDiamondCut.sol";

/**
 * TreasureDiamond — EIP-2535 hub for all Bridgeworld game systems.
 *
 * Owner: Safe 0x51a2bFd2B391413952b206F1902693C46894e6cE
 * Deployed by: 0x49CEF82aEAc2EF371748A2d67F43129b7F0FCb54
 *
 * Facets socket in via DiamondCut; each game domain owns its own
 * LibXxxStorage slot and cannot clobber another domain's state.
 */
contract TreasureDiamond {
    struct Initialization {
        address initContract;
        bytes initData;
    }

    constructor(
        address _owner,
        IDiamondCut.FacetCut[] memory _diamondCut,
        Initialization[] memory _initializations
    ) payable {
        LibDiamond.setContractOwner(_owner);
        LibDiamond.diamondCut(_diamondCut, address(0), "");

        for (uint256 i; i < _initializations.length; i++) {
            LibDiamond.initializeDiamondCut(
                _initializations[i].initContract,
                _initializations[i].initData
            );
        }
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 pos = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly { ds.slot := pos }

        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "TreasureDiamond: unknown selector");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
