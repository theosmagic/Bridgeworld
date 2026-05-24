// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { LibSharedStorage }  from "../shared/LibSharedStorage.sol";
import { LibCraftingStorage } from "./LibCraftingStorage.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * CraftingFacet (Samekh 𐡎) — ERC-20 recipe crafting.
 *
 * Admin defines recipes with one or more ERC-20 input ingredients and one
 * ERC-20 output. Inputs are either burned (via approve+transferFrom to dead
 * address) or routed to the treasury. Output is transferred from the treasury
 * (or minted if the treasury has a mint allowance — off-chain arrangement).
 *
 * ERC-1155 / NFT crafting is handled by the dedicated game facets (slots 16-22).
 */
contract CraftingFacet {
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    event RecipeAdded(uint256 indexed recipeId);
    event RecipeActivated(uint256 indexed recipeId, bool active);
    event Crafted(uint256 indexed recipeId, address indexed crafter);

    modifier onlyAdmin() {
        LibSharedStorage.requireRole(LibSharedStorage.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier notPaused() {
        LibSharedStorage.requireNotPaused();
        _;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function addRecipe(
        address[]  calldata inputTokens,
        uint256[]  calldata inputAmounts,
        bool[]     calldata inputBurn,
        address            outputToken,
        uint256            outputAmount,
        bool               outputMint
    ) external onlyAdmin returns (uint256 recipeId) {
        require(inputTokens.length > 0, "CraftingFacet: no inputs");
        require(
            inputTokens.length == inputAmounts.length &&
            inputTokens.length == inputBurn.length,
            "CraftingFacet: array mismatch"
        );
        require(outputToken != address(0), "CraftingFacet: zero output token");
        require(outputAmount > 0, "CraftingFacet: zero output amount");

        LibCraftingStorage.Storage storage s = LibCraftingStorage.layout();
        recipeId = s.recipes.length;
        s.recipes.push();

        LibCraftingStorage.Recipe storage r = s.recipes[recipeId];
        for (uint256 i; i < inputTokens.length; i++) {
            r.inputs.push(LibCraftingStorage.Ingredient({
                token:  inputTokens[i],
                amount: inputAmounts[i],
                burn:   inputBurn[i]
            }));
        }
        r.outputToken  = outputToken;
        r.outputAmount = outputAmount;
        r.outputMint   = outputMint;
        r.active       = true;

        emit RecipeAdded(recipeId);
    }

    function setRecipeActive(uint256 recipeId, bool active) external onlyAdmin {
        LibCraftingStorage.Storage storage s = LibCraftingStorage.layout();
        require(recipeId < s.recipes.length, "CraftingFacet: invalid id");
        s.recipes[recipeId].active = active;
        emit RecipeActivated(recipeId, active);
    }

    // ── Player ────────────────────────────────────────────────────────────────

    function craft(uint256 recipeId) external notPaused {
        LibCraftingStorage.Storage storage s = LibCraftingStorage.layout();
        require(recipeId < s.recipes.length, "CraftingFacet: invalid id");
        LibCraftingStorage.Recipe storage r = s.recipes[recipeId];
        require(r.active, "CraftingFacet: recipe inactive");

        address treasury = LibSharedStorage.layout().treasury;

        for (uint256 i; i < r.inputs.length; i++) {
            LibCraftingStorage.Ingredient storage ing = r.inputs[i];
            address dest = ing.burn ? DEAD : treasury;
            IERC20(ing.token).transferFrom(msg.sender, dest, ing.amount);
        }

        IERC20(r.outputToken).transferFrom(treasury, msg.sender, r.outputAmount);

        emit Crafted(recipeId, msg.sender);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getRecipe(uint256 recipeId)
        external view
        returns (LibCraftingStorage.Recipe memory)
    {
        LibCraftingStorage.Storage storage s = LibCraftingStorage.layout();
        require(recipeId < s.recipes.length, "CraftingFacet: invalid id");
        return s.recipes[recipeId];
    }

    function recipeCount() external view returns (uint256) {
        return LibCraftingStorage.layout().recipes.length;
    }
}
