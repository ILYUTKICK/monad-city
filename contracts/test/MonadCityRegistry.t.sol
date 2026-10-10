// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { MonadCityRegistry } from "../src/MonadCityRegistry.sol";

interface Vm {
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function warp(uint256 newTimestamp) external;
    function expectRevert() external;
    function expectRevert(bytes4 selector) external;
    function expectRevert(bytes calldata revertData) external;
    function assume(bool condition) external;
    function deal(address account, uint256 newBalance) external;
    function readFile(string calldata path) external view returns (string memory data);
    function parseJsonBytes32(string calldata json, string calldata key) external pure returns (bytes32 value);
    function parseJsonBytes32Array(string calldata json, string calldata key)
        external
        pure
        returns (bytes32[] memory value);
}

contract LineageStub {
    bytes32 public immutable namespaceId;
    bytes32 public immutable headPublicationId;
    uint16 public immutable lineageDepth;

    constructor(bytes32 namespaceId_, bytes32 headPublicationId_, uint16 lineageDepth_) {
        namespaceId = namespaceId_;
        headPublicationId = headPublicationId_;
        lineageDepth = lineageDepth_;
    }

    function publicationExists(bytes32 publicationId) external view returns (bool) {
        return publicationId == headPublicationId;
    }
}

contract MonadCityRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    string private constant NAMESPACE = "monad-city:registry:main:v1";
    address private constant ADMIN = address(0xA11);
    address private constant PUBLISHER = address(0xB22);
    address private constant REVOCER = address(0xC33);
    address private constant NEW_PUBLISHER = address(0xD44);
    address private constant NEW_ADMIN = address(0xE55);
    uint48 private constant ADMIN_DELAY = 2 days;
    uint64 private constant CREATED_AT = 1_790_000_000;
    uint64 private constant REVIEWED_AT = 1_790_000_100;

    bytes32 private constant SNAPSHOT_SHA = 0x9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b;
    bytes32 private constant VERSION_HASH = 0x1d4941f7182efa3313f434e6a2ead429292fbd28a64db3799fc738b2af3a6735;
    bytes32 private constant PORTABLE_SNAPSHOT_ID = 0x7c9d1211d600742ac6b34e64f53410742f156bb953f602756b12f6b1f4ac54c3;
    bytes32 private constant EVIDENCE_ROOT = 0x5eb0597c4b583f148e760d749dd75f38c54ddce2dffeba1280b5b3500a1cb35e;
    bytes32 private constant RELATIONSHIP_ROOT = 0xa21b45b628eb8c4b1842900ccd6bdc0b5d2728e974bcf734e695c79e5f29e930;

    bytes32 private constant EVIDENCE_ID_HASH = 0xe11386c35f913de3d72bbc2881cd3a348919c2a23d64f7d366c7b786b46e55fe;
    bytes32 private constant EVIDENCE_PAYLOAD_SHA = 0x7be127eaf27b6295c5ebb24dfa6d727af39456837922000d15f784843608e75a;
    bytes32 private constant EVIDENCE_LEAF = 0x01d30fcc3359808117b9bc2fcc7efa1e5d5668fb9804a5ce13382c5583482feb;

    bytes32 private constant RELATIONSHIP_ID_HASH = 0xe76d9817f66ed55f81c4d0cd6c5a078da4239be9c8212e858f0daf54d126c76f;
    bytes32 private constant RELATIONSHIP_PAYLOAD_SHA =
        0xa7e475cafa26add55f65d43d595f0e36320a49b276348895033afeeefafb140f;
    bytes32 private constant RELATIONSHIP_LEAF = 0x07efc824ec5a82b6b42ba57d028c2cfb0470a589905b60a1b3d0a8e5ac01ad71;

    MonadCityRegistry private registry;

    function setUp() public {
        vm.warp(2_000_000_000);
        registry = _deploy(address(0), bytes32(0));
    }

    function testProductionManifestVectorsMatchContract() public {
        _assertEq(
            registry.namespaceId(), 0x07715c605c9d90b28bad5a413c4797b590db4bad65e2725355e62cca3c62d959, "namespace"
        );
        _assertEq(registry.computePortableSnapshotId(VERSION_HASH, SNAPSHOT_SHA), PORTABLE_SNAPSHOT_ID, "portable");
        _assertEq(
            registry.computeEvidenceLeaf(PORTABLE_SNAPSHOT_ID, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA),
            EVIDENCE_LEAF,
            "evidence leaf"
        );
        _assertEq(
            registry.computeRelationshipLeaf(PORTABLE_SNAPSHOT_ID, RELATIONSHIP_ID_HASH, RELATIONSHIP_PAYLOAD_SHA),
            RELATIONSHIP_LEAF,
            "relationship leaf"
        );
        _assertEq(registry.processEvidenceProof(EVIDENCE_LEAF, _evidenceProof()), EVIDENCE_ROOT, "evidence root");
        _assertEq(
            registry.processRelationshipProof(RELATIONSHIP_LEAF, _relationshipProof()),
            RELATIONSHIP_ROOT,
            "relationship root"
        );

        bytes32 publicationId = _publishProduction(registry, bytes32(0));
        (bool evidenceIncluded, bool active, bool snapshotRevoked, bool itemRevoked) =
            registry.verifyEvidence(publicationId, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, _evidenceProof());
        _assertTrue(evidenceIncluded && active && !snapshotRevoked && !itemRevoked, "evidence status");

        (bool relationshipIncluded, bool relationshipActive, bool relSnapshotRevoked, bool relItemRevoked) = registry.verifyRelationship(
            publicationId, RELATIONSHIP_ID_HASH, RELATIONSHIP_PAYLOAD_SHA, _relationshipProof()
        );
        _assertTrue(
            relationshipIncluded && relationshipActive && !relSnapshotRevoked && !relItemRevoked, "relationship status"
        );
    }

    function testJavaScriptExportedProofFilesMatchContract() public view {
        string memory evidenceJson = vm.readFile("../data/registry/phase-3.5-v6/evidence-proofs.json");
        bytes32 evidenceIdHash = vm.parseJsonBytes32(evidenceJson, ".entries[0].idHash");
        bytes32 evidencePayloadSha = vm.parseJsonBytes32(evidenceJson, ".entries[0].payloadSha256");
        bytes32 evidenceLeaf = vm.parseJsonBytes32(evidenceJson, ".entries[0].leafSha256");
        bytes32[] memory evidenceProof = vm.parseJsonBytes32Array(evidenceJson, ".entries[0].proof");
        _assertEq(evidenceIdHash, EVIDENCE_ID_HASH, "exported evidence id hash");
        _assertEq(evidencePayloadSha, EVIDENCE_PAYLOAD_SHA, "exported evidence payload");
        _assertEq(
            registry.computeEvidenceLeaf(PORTABLE_SNAPSHOT_ID, evidenceIdHash, evidencePayloadSha),
            evidenceLeaf,
            "exported evidence leaf"
        );
        _assertEq(registry.processEvidenceProof(evidenceLeaf, evidenceProof), EVIDENCE_ROOT, "exported evidence proof");

        string memory relationshipJson = vm.readFile("../data/registry/phase-3.5-v6/relationship-proofs.json");
        bytes32 relationshipIdHash = vm.parseJsonBytes32(relationshipJson, ".entries[0].idHash");
        bytes32 relationshipPayloadSha = vm.parseJsonBytes32(relationshipJson, ".entries[0].payloadSha256");
        bytes32 relationshipLeaf = vm.parseJsonBytes32(relationshipJson, ".entries[0].leafSha256");
        bytes32[] memory relationshipProof = vm.parseJsonBytes32Array(relationshipJson, ".entries[0].proof");
        _assertEq(relationshipIdHash, RELATIONSHIP_ID_HASH, "exported relationship id hash");
        _assertEq(relationshipPayloadSha, RELATIONSHIP_PAYLOAD_SHA, "exported relationship payload");
        _assertEq(
            registry.computeRelationshipLeaf(PORTABLE_SNAPSHOT_ID, relationshipIdHash, relationshipPayloadSha),
            relationshipLeaf,
            "exported relationship leaf"
        );
        _assertEq(
            registry.processRelationshipProof(relationshipLeaf, relationshipProof),
            RELATIONSHIP_ROOT,
            "exported relationship proof"
        );
    }

    function testPublishStoresFixedAnchorAndManifestSeparately() public {
        bytes32 publicationId = _publishProduction(registry, bytes32(0));
        MonadCityRegistry.Publication memory publication = registry.getPublication(publicationId);

        _assertEq(publication.portableSnapshotId, PORTABLE_SNAPSHOT_ID, "portable id");
        _assertEq(publication.versionHash, VERSION_HASH, "version hash");
        _assertEq(publication.snapshotSha256, SNAPSHOT_SHA, "snapshot hash");
        _assertEq(publication.evidenceRoot, EVIDENCE_ROOT, "evidence root");
        _assertEq(publication.relationshipRoot, RELATIONSHIP_ROOT, "relationship root");
        _assertEq(publication.evidenceCount, 193, "evidence count");
        _assertEq(publication.relationshipCount, 6, "relationship count");
        _assertEq(publication.publisher, PUBLISHER, "publisher");
        _assertEq(
            publication.manifestUriSha256,
            sha256(bytes("ipfs://bafy-monad-city-phase-3-5-v6/manifest.json")),
            "manifest digest"
        );
        _assertEq(
            registry.manifestURI(publicationId), "ipfs://bafy-monad-city-phase-3-5-v6/manifest.json", "manifest uri"
        );
        _assertEq(uint256(publication.state), uint256(MonadCityRegistry.PublicationState.Active), "state");
    }

    function testOnlyPublisherCanPublishAndAdminHasNoImplicitBypass() public {
        MonadCityRegistry.PublicationInput memory input = _productionInput(bytes32(0));

        vm.expectRevert();
        vm.prank(address(0xBAD));
        registry.publish(input);

        vm.expectRevert();
        vm.prank(ADMIN);
        registry.publish(input);

        _publish(registry, input);
    }

    function testPublicationCannotOverwriteOrReplayVersion() public {
        bytes32 head = _publishProduction(registry, bytes32(0));
        MonadCityRegistry.PublicationInput memory replay = _productionInput(head);

        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(replay);
    }

    function testMalformedPublicationInputsAndWrongPredecessorRevert() public {
        MonadCityRegistry.PublicationInput memory input = _productionInput(bytes32(0));
        input.evidenceRoot = bytes32(0);
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);

        input = _productionInput(bytes32(0));
        input.evidenceRoot = bytes32(0);
        input.relationshipRoot = bytes32(0);
        input.evidenceCount = 0;
        input.relationshipCount = 0;
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);

        input = _productionInput(bytes32(0));
        input.createdAt = 0;
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);

        input = _productionInput(bytes32(0));
        input.reviewedAt = uint64(block.timestamp + 1);
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);

        input = _productionInput(bytes32(0));
        input.manifestURI = "";
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);

        input = _productionInput(bytes32(0));
        input.manifestURI = new string(registry.MAX_MANIFEST_URI_BYTES() + 1);
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);

        input = _productionInput(sha256("not the head"));
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(input);
    }

    function testContractHasNoPayableEntryPoint() public {
        vm.deal(address(this), 1 ether);
        (bool sent,) = address(registry).call{ value: 1 wei }("");
        _assertFalse(sent, "plain value transfer must fail");
        _assertEq(address(registry).balance, 0, "registry keeps no ordinary transfer");
    }

    function testWrongVersionDomainAndWrongTreeKindFailInclusion() public {
        bytes32 first = _publishProduction(registry, bytes32(0));
        bytes32 nextVersion = sha256("phase-3.5-v7");
        bytes32 nextSnapshot = sha256("different snapshot");
        MonadCityRegistry.PublicationInput memory next = _productionInput(first);
        next.versionHash = nextVersion;
        next.snapshotSha256 = nextSnapshot;
        bytes32 second = _publish(registry, next);

        (bool wrongVersion,,,) =
            registry.verifyEvidence(second, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, _evidenceProof());
        _assertFalse(wrongVersion, "wrong portable snapshot must fail");

        (bool wrongKind,,,) =
            registry.verifyRelationship(first, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, _evidenceProof());
        _assertFalse(wrongKind, "cross-kind proof must fail");
    }

    function testSupersessionAndSuccessorAfterRevokedHead() public {
        bytes32 first = _publishProduction(registry, bytes32(0));
        bytes32 reason = sha256("publisher withdrawal");
        vm.prank(PUBLISHER);
        registry.revokeSnapshot(first, reason);

        (, bool existsBefore, bool activeBefore, bool revokedBefore) = registry.publicationStatus(first);
        _assertTrue(existsBefore && !activeBefore && revokedBefore, "revoked head");

        bytes32 second = _publishSingleEvidence(registry, first, sha256("phase-3.5-v7"), EVIDENCE_ID_HASH);
        (MonadCityRegistry.PublicationState firstState,,, bool firstRevoked) = registry.publicationStatus(first);
        (MonadCityRegistry.PublicationState secondState,, bool secondActive,) = registry.publicationStatus(second);
        _assertEq(uint256(firstState), uint256(MonadCityRegistry.PublicationState.Revoked), "old remains revoked");
        _assertTrue(firstRevoked, "revoked bit");
        _assertEq(uint256(secondState), uint256(MonadCityRegistry.PublicationState.Active), "new active enum");
        _assertTrue(secondActive, "new active");
    }

    function testFormerPublisherCannotGloballyRevokeAfterRotation() public {
        bytes32 publicationId = _publishProduction(registry, bytes32(0));
        vm.startPrank(ADMIN);
        registry.grantRole(registry.PUBLISHER_ROLE(), NEW_PUBLISHER);
        registry.revokeRole(registry.PUBLISHER_ROLE(), PUBLISHER);
        vm.stopPrank();

        bytes32[] memory proof = _evidenceProof();
        bytes32 reason = sha256("bad power");
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.revokeEvidence(publicationId, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, proof, reason);
        _assertFalse(
            registry.isItemRevoked(MonadCityRegistry.SubjectKind.Evidence, EVIDENCE_ID_HASH), "not globally revoked"
        );
    }

    function testPublisherHasNoImplicitItemRevokerPowerButRetainsOwnSnapshotWithdrawal() public {
        bytes32 publicationId = _publishProduction(registry, bytes32(0));
        bytes32 publisherRole = registry.PUBLISHER_ROLE();
        bytes32 unauthorizedReason = sha256("not authorized");
        bytes32 withdrawalReason = sha256("publisher withdrawal remains available");
        vm.prank(ADMIN);
        registry.revokeRole(publisherRole, PUBLISHER);

        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.revokeEvidence(
            publicationId, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, _evidenceProof(), unauthorizedReason
        );

        vm.prank(PUBLISHER);
        registry.revokeSnapshot(publicationId, withdrawalReason);
        (MonadCityRegistry.PublicationState state, bool exists, bool active, bool revoked) =
            registry.publicationStatus(publicationId);
        _assertTrue(exists && !active && revoked, "publisher may withdraw its own publication");
        _assertEq(uint256(state), uint256(MonadCityRegistry.PublicationState.Revoked), "withdrawn state");
    }

    function testAdminHasNoImplicitPublishOrRevocationAuthority() public {
        bytes32 publicationId = _publishProduction(registry, bytes32(0));
        bytes32 snapshotReason = sha256("admin is not a snapshot revoker");
        bytes32 itemReason = sha256("admin is not an item revoker");
        vm.expectRevert();
        vm.prank(ADMIN);
        registry.revokeSnapshot(publicationId, snapshotReason);
        vm.expectRevert();
        vm.prank(ADMIN);
        registry.revokeRelationship(
            publicationId, RELATIONSHIP_ID_HASH, RELATIONSHIP_PAYLOAD_SHA, _relationshipProof(), itemReason
        );
    }

    function testItemRevocationIsPermanentAcrossVersions() public {
        bytes32 first = _publishProduction(registry, bytes32(0));
        bytes32 reason = sha256("immutable ID withdrawn");
        bytes32[] memory proof = _evidenceProof();
        vm.prank(REVOCER);
        registry.revokeEvidence(first, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, proof, reason);

        MonadCityRegistry.ItemRevocation memory revocation =
            registry.getItemRevocation(MonadCityRegistry.SubjectKind.Evidence, EVIDENCE_ID_HASH);
        _assertEq(revocation.originPublicationId, first, "revocation origin");
        _assertEq(revocation.originPayloadSha256, EVIDENCE_PAYLOAD_SHA, "origin payload");
        _assertEq(revocation.reasonSha256, reason, "reason");

        bytes32 second = _publishSingleEvidence(registry, first, sha256("phase-3.5-v7"), EVIDENCE_ID_HASH);
        (bool included, bool active, bool snapshotRevoked, bool itemRevoked) =
            registry.verifyEvidence(second, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, new bytes32[](0));
        _assertTrue(included && active && !snapshotRevoked && itemRevoked, "global revocation follows id");

        bytes32 secondReason = sha256("again");
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.expectRevert();
        vm.prank(REVOCER);
        registry.revokeEvidence(second, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, emptyProof, secondReason);
    }

    function testInvalidProofCannotRevokeAndProofLengthIsBounded() public {
        bytes32 publicationId = _publishProduction(registry, bytes32(0));
        bytes32[] memory badProof = _evidenceProof();
        badProof[0] = bytes32(uint256(badProof[0]) ^ 1);
        bytes32 reason = sha256("invalid");
        vm.expectRevert();
        vm.prank(REVOCER);
        registry.revokeEvidence(publicationId, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, badProof, reason);

        bytes32[] memory tooLong = new bytes32[](65);
        vm.expectRevert();
        registry.processEvidenceProof(EVIDENCE_LEAF, tooLong);
    }

    function testDelayedTwoStepAdminTransfer() public {
        bytes32 publisherRole = registry.PUBLISHER_ROLE();
        vm.prank(ADMIN);
        registry.beginDefaultAdminTransfer(NEW_ADMIN);

        vm.expectRevert();
        vm.prank(NEW_ADMIN);
        registry.acceptDefaultAdminTransfer();

        vm.warp(block.timestamp + ADMIN_DELAY + 1);
        vm.prank(NEW_ADMIN);
        registry.acceptDefaultAdminTransfer();
        _assertEq(registry.defaultAdmin(), NEW_ADMIN, "new admin");

        vm.expectRevert();
        vm.prank(ADMIN);
        registry.grantRole(publisherRole, NEW_PUBLISHER);

        vm.prank(NEW_ADMIN);
        registry.grantRole(publisherRole, NEW_PUBLISHER);
        _assertTrue(registry.hasRole(publisherRole, NEW_PUBLISHER), "new admin grants");
    }

    function testPublisherAndRevokerRotationIsExplicitAndImmediate() public {
        bytes32 publisherRole = registry.PUBLISHER_ROLE();
        bytes32 revokerRole = registry.REVOCER_ROLE();
        vm.startPrank(ADMIN);
        registry.grantRole(publisherRole, NEW_PUBLISHER);
        registry.grantRole(revokerRole, NEW_PUBLISHER);
        registry.revokeRole(publisherRole, PUBLISHER);
        registry.revokeRole(revokerRole, REVOCER);
        vm.stopPrank();

        _assertTrue(registry.hasRole(publisherRole, NEW_PUBLISHER), "new publisher active immediately");
        _assertTrue(registry.hasRole(revokerRole, NEW_PUBLISHER), "new revoker active immediately");
        _assertFalse(registry.hasRole(publisherRole, PUBLISHER), "old publisher removed");
        _assertFalse(registry.hasRole(revokerRole, REVOCER), "old revoker removed");
    }

    function testEmptySuccessorCannotFreezeAndConfirmedMigrationSupersedesHead() public {
        bytes32 oldHead = _publishProduction(registry, bytes32(0));
        MonadCityRegistry successor = new MonadCityRegistry(
            NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(registry), oldHead
        );

        vm.expectRevert();
        vm.prank(ADMIN);
        registry.confirmSuccessor(address(successor));
        _assertFalse(registry.publicationFrozen(), "old registry remains writable");

        _publishSingleEvidence(successor, bytes32(0), sha256("successor-v1"), sha256("successor-evidence-id"));
        vm.prank(ADMIN);
        registry.confirmSuccessor(address(successor));

        _assertEq(registry.successorRegistry(), address(successor), "successor pointer");
        _assertTrue(registry.publicationFrozen(), "publication frozen");
        (MonadCityRegistry.PublicationState state,, bool active,) = registry.publicationStatus(oldHead);
        _assertEq(uint256(state), uint256(MonadCityRegistry.PublicationState.Superseded), "migrated head state");
        _assertFalse(active, "migrated head inactive");

        MonadCityRegistry.PublicationInput memory forbidden =
            _singleEvidenceInput(oldHead, sha256("forbidden"), EVIDENCE_ID_HASH, registry);
        vm.expectRevert();
        vm.prank(PUBLISHER);
        registry.publish(forbidden);

        bytes32 reason = sha256("post-migration revocation");
        vm.prank(PUBLISHER);
        registry.revokeSnapshot(oldHead, reason);
        (MonadCityRegistry.PublicationState revokedState,,, bool revoked) = registry.publicationStatus(oldHead);
        _assertEq(uint256(revokedState), uint256(MonadCityRegistry.PublicationState.Revoked), "revoked state");
        _assertTrue(revoked, "revoked after migration");
    }

    function testRevokedSuccessorHeadCannotFreezePredecessor() public {
        bytes32 oldHead = _publishProduction(registry, bytes32(0));
        MonadCityRegistry successor = new MonadCityRegistry(
            NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(registry), oldHead
        );
        bytes32 successorHead =
            _publishSingleEvidence(successor, bytes32(0), sha256("revoked-successor-v1"), EVIDENCE_ID_HASH);
        bytes32 reason = sha256("successor withdrawn before migration");
        vm.prank(NEW_PUBLISHER);
        successor.revokeSnapshot(successorHead, reason);

        vm.expectRevert();
        vm.prank(ADMIN);
        registry.confirmSuccessor(address(successor));
        _assertFalse(registry.publicationFrozen(), "revoked successor cannot freeze predecessor");
        _assertEq(registry.successorRegistry(), address(0), "no successor pointer");
    }

    function testGlobalItemRevocationSurvivesMigration() public {
        bytes32 oldHead = _publishProduction(registry, bytes32(0));
        bytes32[] memory proof = _evidenceProof();
        bytes32 reason = sha256("withdraw before migration");
        vm.prank(REVOCER);
        registry.revokeEvidence(oldHead, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, proof, reason);

        MonadCityRegistry successor = new MonadCityRegistry(
            NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(registry), oldHead
        );
        bytes32 successorHead =
            _publishSingleEvidence(successor, bytes32(0), sha256("successor-carries-old-id"), EVIDENCE_ID_HASH);
        vm.prank(ADMIN);
        registry.confirmSuccessor(address(successor));

        _assertTrue(
            successor.isItemRevoked(MonadCityRegistry.SubjectKind.Evidence, EVIDENCE_ID_HASH),
            "predecessor revocation remains effective"
        );
        (bool included, bool active, bool snapshotRevoked, bool itemRevoked) =
            successor.verifyEvidence(successorHead, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, new bytes32[](0));
        _assertTrue(included && active && !snapshotRevoked && itemRevoked, "successor verification sees revocation");

        bytes32 secondReason = sha256("cannot revoke twice");
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.expectRevert();
        vm.prank(REVOCER);
        successor.revokeEvidence(successorHead, EVIDENCE_ID_HASH, EVIDENCE_PAYLOAD_SHA, emptyProof, secondReason);
    }

    function testRelationshipRevocationAddedAfterMigrationSurvivesMultipleSuccessors() public {
        bytes32 predecessorHead = _publishProduction(registry, bytes32(0));
        MonadCityRegistry successor = new MonadCityRegistry(
            NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(registry), predecessorHead
        );
        bytes32 successorHead = _publishSingleRelationship(
            successor, bytes32(0), sha256("successor-relationship-v1"), RELATIONSHIP_ID_HASH
        );
        vm.prank(ADMIN);
        registry.confirmSuccessor(address(successor));

        bytes32 reason = sha256("withdrawn after migration");
        vm.prank(REVOCER);
        registry.revokeRelationship(
            predecessorHead, RELATIONSHIP_ID_HASH, RELATIONSHIP_PAYLOAD_SHA, _relationshipProof(), reason
        );
        _assertTrue(
            successor.isItemRevoked(MonadCityRegistry.SubjectKind.Relationship, RELATIONSHIP_ID_HASH),
            "live predecessor lookup sees later revocation"
        );

        MonadCityRegistry grandSuccessor = new MonadCityRegistry(
            NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(successor), successorHead
        );
        bytes32 grandHead = _publishSingleRelationship(
            grandSuccessor, bytes32(0), sha256("grand-successor-relationship-v1"), RELATIONSHIP_ID_HASH
        );
        vm.prank(NEW_ADMIN);
        successor.confirmSuccessor(address(grandSuccessor));

        (bool included, bool active, bool snapshotRevoked, bool itemRevoked) = grandSuccessor.verifyRelationship(
            grandHead, RELATIONSHIP_ID_HASH, RELATIONSHIP_PAYLOAD_SHA, new bytes32[](0)
        );
        _assertTrue(included && active && !snapshotRevoked && itemRevoked, "grand successor sees revocation");
    }

    function testConstructorRejectsMismatchedPredecessorNamespace() public {
        bytes32 oldHead = _publishProduction(registry, bytes32(0));
        vm.expectRevert();
        new MonadCityRegistry(
            "different:namespace", NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(registry), oldHead
        );
    }

    function testConstructorRequiresExactPredecessorHead() public {
        bytes32 first = _publishProduction(registry, bytes32(0));
        _publishSingleEvidence(registry, first, sha256("phase-3.5-v7"), EVIDENCE_ID_HASH);
        vm.expectRevert();
        new MonadCityRegistry(NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(registry), first);
    }

    function testConstructorRejectsLineageBeyondPermanentLimit() public {
        bytes32 head = sha256("stub-head");
        LineageStub predecessor = new LineageStub(sha256(bytes(NAMESPACE)), head, uint16(registry.MAX_LINEAGE_DEPTH()));
        vm.expectRevert();
        new MonadCityRegistry(NAMESPACE, NEW_ADMIN, ADMIN_DELAY, NEW_PUBLISHER, REVOCER, address(predecessor), head);
    }

    function testSupersededAndRevokedPublicationDataRemainReadable() public {
        bytes32 first = _publishProduction(registry, bytes32(0));
        bytes32 second = _publishSingleEvidence(registry, first, sha256("phase-3.5-v7"), EVIDENCE_ID_HASH);
        bytes32 reason = sha256("historical withdrawal");
        vm.prank(REVOCER);
        registry.revokeSnapshot(first, reason);

        MonadCityRegistry.Publication memory historical = registry.getPublication(first);
        _assertEq(historical.evidenceRoot, EVIDENCE_ROOT, "historical root retained");
        _assertEq(historical.relationshipRoot, RELATIONSHIP_ROOT, "historical relationship root retained");
        _assertEq(historical.previousPublicationId, bytes32(0), "historical predecessor retained");
        _assertEq(registry.headPublicationId(), second, "head remains successor");
    }

    function testOddLevelDuplicatesFinalNode() public view {
        bytes32 domain = registry.EVIDENCE_NODE_DOMAIN();
        bytes32 first = sha256("leaf-a");
        bytes32 second = sha256("leaf-b");
        bytes32 third = sha256("leaf-c");
        bytes32 pair = _node(domain, first, second);
        bytes32 duplicate = _node(domain, third, third);
        bytes32 expectedRoot = _node(domain, pair, duplicate);

        bytes32[] memory proof = new bytes32[](2);
        proof[0] = third;
        proof[1] = pair;
        _assertEq(registry.processEvidenceProof(third, proof), expectedRoot, "duplicate-self odd node");
    }

    function testFuzzSingleLeafProofAndCommutativeNode(bytes32 idHash, bytes32 payloadSha256, bytes32 sibling) public {
        vm.assume(idHash != bytes32(0) && payloadSha256 != bytes32(0));
        bytes32 versionHash = sha256(abi.encodePacked("fuzz-version", idHash, payloadSha256));
        bytes32 snapshotSha = sha256(abi.encodePacked("fuzz-snapshot", idHash, payloadSha256));
        bytes32 portable = registry.computePortableSnapshotId(versionHash, snapshotSha);
        bytes32 leaf = registry.computeEvidenceLeaf(portable, idHash, payloadSha256);
        MonadCityRegistry.PublicationInput memory input = MonadCityRegistry.PublicationInput({
            versionHash: versionHash,
            snapshotSha256: snapshotSha,
            evidenceRoot: leaf,
            relationshipRoot: bytes32(0),
            previousPublicationId: bytes32(0),
            evidenceCount: 1,
            relationshipCount: 0,
            createdAt: CREATED_AT,
            reviewedAt: REVIEWED_AT,
            manifestURI: "ipfs://fuzz/manifest.json"
        });
        bytes32 publicationId = _publish(registry, input);
        (bool included,,,) = registry.verifyEvidence(publicationId, idHash, payloadSha256, new bytes32[](0));
        _assertTrue(included, "single leaf proof");

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = sibling;
        bytes32 expected = _node(registry.EVIDENCE_NODE_DOMAIN(), leaf, sibling);
        _assertEq(registry.processEvidenceProof(leaf, proof), expected, "commutative node");
    }

    function _deploy(address predecessor, bytes32 predecessorPublication) private returns (MonadCityRegistry) {
        return
            new MonadCityRegistry(
                NAMESPACE, ADMIN, ADMIN_DELAY, PUBLISHER, REVOCER, predecessor, predecessorPublication
            );
    }

    function _publishProduction(MonadCityRegistry target, bytes32 previous) private returns (bytes32) {
        return _publish(target, _productionInput(previous));
    }

    function _productionInput(bytes32 previous) private pure returns (MonadCityRegistry.PublicationInput memory) {
        return MonadCityRegistry.PublicationInput({
            versionHash: VERSION_HASH,
            snapshotSha256: SNAPSHOT_SHA,
            evidenceRoot: EVIDENCE_ROOT,
            relationshipRoot: RELATIONSHIP_ROOT,
            previousPublicationId: previous,
            evidenceCount: 193,
            relationshipCount: 6,
            createdAt: CREATED_AT,
            reviewedAt: REVIEWED_AT,
            manifestURI: "ipfs://bafy-monad-city-phase-3-5-v6/manifest.json"
        });
    }

    function _publishSingleEvidence(MonadCityRegistry target, bytes32 previous, bytes32 versionHash, bytes32 idHash)
        private
        returns (bytes32)
    {
        return _publish(target, _singleEvidenceInput(previous, versionHash, idHash, target));
    }

    function _publishSingleRelationship(MonadCityRegistry target, bytes32 previous, bytes32 versionHash, bytes32 idHash)
        private
        returns (bytes32)
    {
        bytes32 snapshotSha = sha256(abi.encodePacked("snapshot", versionHash));
        bytes32 portable = target.computePortableSnapshotId(versionHash, snapshotSha);
        bytes32 leaf = target.computeRelationshipLeaf(portable, idHash, RELATIONSHIP_PAYLOAD_SHA);
        MonadCityRegistry.PublicationInput memory input = MonadCityRegistry.PublicationInput({
            versionHash: versionHash,
            snapshotSha256: snapshotSha,
            evidenceRoot: bytes32(0),
            relationshipRoot: leaf,
            previousPublicationId: previous,
            evidenceCount: 0,
            relationshipCount: 1,
            createdAt: CREATED_AT,
            reviewedAt: REVIEWED_AT,
            manifestURI: "ipfs://successor/relationship-manifest.json"
        });
        return _publish(target, input);
    }

    function _singleEvidenceInput(bytes32 previous, bytes32 versionHash, bytes32 idHash, MonadCityRegistry target)
        private
        view
        returns (MonadCityRegistry.PublicationInput memory)
    {
        bytes32 snapshotSha = sha256(abi.encodePacked("snapshot", versionHash));
        bytes32 portable = target.computePortableSnapshotId(versionHash, snapshotSha);
        bytes32 leaf = target.computeEvidenceLeaf(portable, idHash, EVIDENCE_PAYLOAD_SHA);
        return MonadCityRegistry.PublicationInput({
            versionHash: versionHash,
            snapshotSha256: snapshotSha,
            evidenceRoot: leaf,
            relationshipRoot: bytes32(0),
            previousPublicationId: previous,
            evidenceCount: 1,
            relationshipCount: 0,
            createdAt: CREATED_AT,
            reviewedAt: REVIEWED_AT,
            manifestURI: "ipfs://successor/manifest.json"
        });
    }

    function _publish(MonadCityRegistry target, MonadCityRegistry.PublicationInput memory input)
        private
        returns (bytes32)
    {
        address publisher = target == registry ? PUBLISHER : NEW_PUBLISHER;
        vm.prank(publisher);
        return target.publish(input);
    }

    function _evidenceProof() private pure returns (bytes32[] memory proof) {
        proof = new bytes32[](8);
        proof[0] = 0x05af44016e08e4c5e87bd6f47f8b14c34c623ca8138810a3330458ca1f3bf827;
        proof[1] = 0x4aa086d3d63d40fa558810240a07b62f3ad6a5fbe5f243e29c819bd452b0e92e;
        proof[2] = 0xf306400d27ea0e2036f26fd3d95483b78604dba85efbec1c8ae46f1ab0fb8064;
        proof[3] = 0x6c532c748a35bc0d6c24993fd11884ea1a9237ea1cb80c08143f2e4a08728fa4;
        proof[4] = 0x53520ec377ffa453cd82fb4a7c8af5d0f6e2ffd2b1531748ff4eeac192782974;
        proof[5] = 0x4f97299a97df4e8eb9bc538127d025790037de775074bd875a28e02cc73e78f1;
        proof[6] = 0xf4852d88618a36a1c9bbd5b697ba41f8013386c7408b32feb323bf3c060d2e05;
        proof[7] = 0xb951f994a171596aee55d5dd16dbc1661d0adc535f8e45fc45e27dec55a209cf;
    }

    function _relationshipProof() private pure returns (bytes32[] memory proof) {
        proof = new bytes32[](3);
        proof[0] = 0x53b6224a8e7846e362109bad2f56a17dbee6502f42ce69389cc5da3a9027d79c;
        proof[1] = 0x6c39eda22d93458d4841933bfce644f83e8d4978169874a925e96adee5bbe35f;
        proof[2] = 0x7519f8fe88aea59b5907b36b4af3537df16bc43d902e91ed89df9834f0e9c519;
    }

    function _node(bytes32 domain, bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? sha256(abi.encodePacked(domain, a, b)) : sha256(abi.encodePacked(domain, b, a));
    }

    function _assertTrue(bool value, string memory message) private pure {
        require(value, message);
    }

    function _assertFalse(bool value, string memory message) private pure {
        require(!value, message);
    }

    function _assertEq(bytes32 actual, bytes32 expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function _assertEq(address actual, address expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function _assertEq(uint256 actual, uint256 expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function _assertEq(string memory actual, string memory expected, string memory message) private pure {
        require(keccak256(bytes(actual)) == keccak256(bytes(expected)), message);
    }
}
