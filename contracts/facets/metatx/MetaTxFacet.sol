// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage } from "../shared/LibSharedStorage.sol";
import { LibMetaTxStorage }  from "./LibMetaTxStorage.sol";

/**
 * MetaTxFacet (Kaph 𐡊) — EIP-2771 trusted-forwarder registry.
 *
 * Facets that want gasless meta-tx support should call
 * LibMetaTxStorage.layout().trustedForwarders[msg.sender] in their _msgSender() helper.
 */
contract MetaTxFacet {
    event TrustedForwarderSet(address indexed forwarder, bool trusted);
    event PrimaryForwarderSet(address indexed forwarder);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    function setTrustedForwarder(address forwarder, bool trusted) external onlyAdmin {
        LibMetaTxStorage.layout().trustedForwarders[forwarder] = trusted;
        emit TrustedForwarderSet(forwarder, trusted);
    }

    function setPrimaryForwarder(address forwarder) external onlyAdmin {
        require(LibMetaTxStorage.layout().trustedForwarders[forwarder], "MetaTxFacet: not trusted");
        LibMetaTxStorage.layout().primaryForwarder = forwarder;
        emit PrimaryForwarderSet(forwarder);
    }

    function isTrustedForwarder(address forwarder) external view returns (bool) {
        return LibMetaTxStorage.layout().trustedForwarders[forwarder];
    }

    function trustedForwarder() external view returns (address) {
        return LibMetaTxStorage.layout().primaryForwarder;
    }
}
