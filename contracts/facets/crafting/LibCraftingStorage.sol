// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Crafting recipe storage.
 * Slot: keccak256("treasure.diamond.crafting.storage") - 1
 */
library LibCraftingStorage {
    bytes32 internal constant STORAGE_SLOT =
        bytes32(uint256(keccak256(abi.encodePacked("treasure.diamond.crafting.storage"))) - 1);

    struct Ingredient {
        address token;
        uint256 amount;
        bool    burn;   // true = burnFrom, false = transferFrom to treasury
    }

    struct Recipe {
        Ingredient[] inputs;
        address      outputToken;
        uint256      outputAmount;
        bool         outputMint; // true = mintTo caller, false = transfer from treasury
        bool         active;
    }

    struct Storage {
        Recipe[] recipes; // index = recipeId
    }

    function layout() internal pure returns (Storage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }
}
