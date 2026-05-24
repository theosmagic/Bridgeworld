// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibHarvesterStorage } from "./LibHarvesterStorage.sol";

/**
 * HarvesterFacet — registry view and lifecycle management for Harvester beacon proxies.
 * The actual yield logic lives in the standalone Harvester.sol beacons;
 * this facet wires their addresses into the diamond for discovery and admin.
 */
contract HarvesterFacet {
    event HarvesterRegistered(address indexed proxy, address indexed nftHandler);
    event HarvesterDeactivated(address indexed proxy);
    event FactorySet(address factory);
    event MiddlemanSet(address middleman);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setHarvesterContracts(address _factory, address _middleman) external onlyAdmin {
        LibHarvesterStorage.Storage storage s = LibHarvesterStorage.layout();
        s.factory   = _factory;
        s.middleman = _middleman;
        emit FactorySet(_factory);
        emit MiddlemanSet(_middleman);
    }

    function registerHarvester(address _proxy, address _nftHandler) external onlyAdmin {
        LibHarvesterStorage.Storage storage s = LibHarvesterStorage.layout();
        s.harvesterInfo[_proxy] = LibHarvesterStorage.HarvesterInfo({
            proxy:      _proxy,
            nftHandler: _nftHandler,
            active:     true
        });
        s.allHarvesters.push(_proxy);
        emit HarvesterRegistered(_proxy, _nftHandler);
    }

    function deactivateHarvester(address _proxy) external onlyAdmin {
        LibHarvesterStorage.layout().harvesterInfo[_proxy].active = false;
        emit HarvesterDeactivated(_proxy);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getHarvesterFactory() external view returns (address) {
        return LibHarvesterStorage.layout().factory;
    }

    function getHarvesterMiddleman() external view returns (address) {
        return LibHarvesterStorage.layout().middleman;
    }

    function getAllHarvesters() external view returns (address[] memory) {
        return LibHarvesterStorage.layout().allHarvesters;
    }

    function getHarvesterInfo(address _proxy)
        external
        view
        returns (LibHarvesterStorage.HarvesterInfo memory)
    {
        return LibHarvesterStorage.layout().harvesterInfo[_proxy];
    }
}
