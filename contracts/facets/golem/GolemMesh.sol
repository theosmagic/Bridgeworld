// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * GolemMesh — Ownable 3D renderer mesh asset for a Golem.
 *
 * Owner = the Golem's CDP agent wallet (Eternal_⟐_Scribe / Neurochimp operator).
 * Each mesh maps to a GolemFacet token ID and carries:
 *   - Content address (IPFS/Abstract) for the geometry + material
 *   - Packed world transform (position / rotation / scale, 1e6 fixed-point)
 *   - Neurochimp agentId binding so the OTA loop can reference its mesh on-chain
 *
 * The Observe-Think-Act daemon (golem_neurochimp.js) is the sole caller of
 * mutating functions — it holds the owner key via CDP SDK.
 */
contract GolemMesh is Ownable {

    // ── Structs ───────────────────────────────────────────────────────────────

    /// @dev All values are 1e6 fixed-point except rotation (degrees * 1000).
    struct MeshTransform {
        int64  x;   int64  y;   int64  z;    // position
        int64  rx;  int64  ry;  int64  rz;   // rotation (degrees × 1000)
        uint64 sx;  uint64 sy;  uint64 sz;   // scale (1_000_000 = 1.0)
    }

    struct MeshAsset {
        uint256       golemTokenId;
        string        meshUri;       // ipfs:// | abstract:// content CID
        string        materialUri;
        MeshTransform transform;
        uint64        lastSyncBlock;
        bool          active;
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    uint256 public meshCount;

    mapping(uint256 => MeshAsset) private _meshes;
    mapping(uint256 => string)    private _agentId;     // meshId → Neurochimp agentId

    // ── Events ────────────────────────────────────────────────────────────────

    event MeshMinted(uint256 indexed meshId, uint256 indexed golemTokenId, string meshUri);
    event MeshTransformed(uint256 indexed meshId, MeshTransform transform);
    event AgentBound(uint256 indexed meshId, string agentId, uint64 blockNumber);
    event MeshDeactivated(uint256 indexed meshId);

    // ── Constructor ───────────────────────────────────────────────────────────

    /// @param initialOwner  CDP agent wallet address (Eternal_⟐_Scribe / Golem operator)
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ── Owner actions (called exclusively by golem_neurochimp.js) ─────────────

    /**
     * Mint a mesh asset for a deployed Golem.
     * @param golemTokenId  GolemFacet token ID this mesh belongs to
     * @param meshUri       Content address of the 3-D geometry (IPFS or Abstract)
     * @param materialUri   Content address of the PBR material
     * @return meshId       Sequential mesh identifier (starts at 1)
     */
    function mintMesh(
        uint256 golemTokenId,
        string calldata meshUri,
        string calldata materialUri
    ) external onlyOwner returns (uint256 meshId) {
        meshId = ++meshCount;
        _meshes[meshId] = MeshAsset({
            golemTokenId:  golemTokenId,
            meshUri:       meshUri,
            materialUri:   materialUri,
            transform:     MeshTransform(0, 0, 0, 0, 0, 0, 1_000_000, 1_000_000, 1_000_000),
            lastSyncBlock: uint64(block.number),
            active:        true
        });
        emit MeshMinted(meshId, golemTokenId, meshUri);
    }

    /**
     * Push a new world transform from the Neurochimp Act phase.
     * Called after the OTA loop resolves position/rotation/scale for this frame.
     */
    function updateTransform(
        uint256 meshId,
        MeshTransform calldata transform
    ) external onlyOwner {
        MeshAsset storage m = _meshes[meshId];
        require(m.active, "GolemMesh: mesh inactive");
        m.transform     = transform;
        m.lastSyncBlock = uint64(block.number);
        emit MeshTransformed(meshId, transform);
    }

    /**
     * Bind a live Neurochimp agentId to a mesh so the OTA daemon can
     * reference the correct brain when acting on this mesh.
     */
    function bindAgent(uint256 meshId, string calldata agentId) external onlyOwner {
        require(_meshes[meshId].active, "GolemMesh: mesh inactive");
        _agentId[meshId] = agentId;
        emit AgentBound(meshId, agentId, uint64(block.number));
    }

    /**
     * Permanently deactivate a mesh (Golem destroyed / season ended).
     */
    function deactivate(uint256 meshId) external onlyOwner {
        require(_meshes[meshId].active, "GolemMesh: already inactive");
        _meshes[meshId].active = false;
        emit MeshDeactivated(meshId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getMesh(uint256 meshId) external view returns (MeshAsset memory) {
        return _meshes[meshId];
    }

    function getAgentId(uint256 meshId) external view returns (string memory) {
        return _agentId[meshId];
    }

    function getTransform(uint256 meshId) external view returns (MeshTransform memory) {
        return _meshes[meshId].transform;
    }
}
