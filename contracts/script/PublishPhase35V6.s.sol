// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { MonadCityRegistry } from "../src/MonadCityRegistry.sol";

interface PublicationVm {
    function envAddress(string calldata name) external view returns (address value);
    function envString(string calldata name) external view returns (string memory value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Builds the exact phase-3.5-v6 publication call after an operator supplies its content-addressed URI.
contract PublishPhase35V6 {
    PublicationVm private constant vm = PublicationVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 private constant VERSION_HASH = 0x1d4941f7182efa3313f434e6a2ead429292fbd28a64db3799fc738b2af3a6735;
    bytes32 private constant SNAPSHOT_SHA256 = 0x9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b;
    bytes32 private constant EVIDENCE_ROOT = 0x5eb0597c4b583f148e760d749dd75f38c54ddce2dffeba1280b5b3500a1cb35e;
    bytes32 private constant RELATIONSHIP_ROOT = 0xa21b45b628eb8c4b1842900ccd6bdc0b5d2728e974bcf734e695c79e5f29e930;
    bytes32 private constant NAMESPACE_ID = 0x07715c605c9d90b28bad5a413c4797b590db4bad65e2725355e62cca3c62d959;
    bytes32 private constant PORTABLE_SNAPSHOT_ID = 0x7c9d1211d600742ac6b34e64f53410742f156bb953f602756b12f6b1f4ac54c3;
    uint64 private constant SNAPSHOT_TIMESTAMP = 1_790_533_200;

    function run() external returns (bytes32 publicationId) {
        MonadCityRegistry registry = MonadCityRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        string memory manifestURI = vm.envString("REGISTRY_MANIFEST_URI");
        require(registry.REGISTRY_PROTOCOL_VERSION() == 1, "unexpected registry protocol");
        require(registry.namespaceId() == NAMESPACE_ID, "unexpected registry namespace");
        require(
            registry.computePortableSnapshotId(VERSION_HASH, SNAPSHOT_SHA256) == PORTABLE_SNAPSHOT_ID,
            "unexpected portable snapshot id"
        );
        require(registry.headPublicationId() == bytes32(0), "v6 script requires an empty registry");
        require(
            _startsWith(manifestURI, "ipfs://") || _startsWith(manifestURI, "ar://"), "URI is not content-addressed"
        );

        MonadCityRegistry.PublicationInput memory input = MonadCityRegistry.PublicationInput({
            versionHash: VERSION_HASH,
            snapshotSha256: SNAPSHOT_SHA256,
            evidenceRoot: EVIDENCE_ROOT,
            relationshipRoot: RELATIONSHIP_ROOT,
            previousPublicationId: bytes32(0),
            evidenceCount: 193,
            relationshipCount: 6,
            createdAt: SNAPSHOT_TIMESTAMP,
            reviewedAt: SNAPSHOT_TIMESTAMP,
            manifestURI: manifestURI
        });

        vm.startBroadcast();
        publicationId = registry.publish(input);
        vm.stopBroadcast();
    }

    function _startsWith(string memory value, string memory prefix) private pure returns (bool) {
        bytes memory valueBytes = bytes(value);
        bytes memory prefixBytes = bytes(prefix);
        if (valueBytes.length <= prefixBytes.length) return false;
        for (uint256 i; i < prefixBytes.length; ++i) {
            if (valueBytes[i] != prefixBytes[i]) return false;
        }
        return true;
    }
}
