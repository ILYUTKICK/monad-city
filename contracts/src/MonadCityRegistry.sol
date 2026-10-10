// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";

interface IMonadCityRegistryLineage {
    function namespaceId() external view returns (bytes32);
    function deploymentId() external view returns (bytes32);
    function predecessorRegistry() external view returns (address);
    function predecessorPublicationId() external view returns (bytes32);
    function publicationExists(bytes32 publicationId) external view returns (bool);
    function headPublicationId() external view returns (bytes32);
    function isPublicationActive(bytes32 publicationId) external view returns (bool);
    function isItemRevoked(uint8 kind, bytes32 idHash) external view returns (bool);
    function lineageDepth() external view returns (uint16);
}

/// @title Monad City Evidence Registry
/// @notice Publishes immutable, source-data commitments. Inclusion proves exact-byte membership only.
/// @dev Each deployment is bound to one namespace. It deliberately has no proxy, token, funds, or claim flow.
contract MonadCityRegistry is AccessControlDefaultAdminRules {
    enum PublicationState {
        Unknown,
        Active,
        Superseded,
        Revoked
    }

    enum SubjectKind {
        Evidence,
        Relationship
    }

    struct PublicationInput {
        bytes32 versionHash;
        bytes32 snapshotSha256;
        bytes32 evidenceRoot;
        bytes32 relationshipRoot;
        bytes32 previousPublicationId;
        uint64 evidenceCount;
        uint64 relationshipCount;
        uint64 createdAt;
        uint64 reviewedAt;
        string manifestURI;
    }

    /// @dev Fixed-word publication data. Retrieve the bounded string separately with manifestURI().
    struct Publication {
        bytes32 portableSnapshotId;
        bytes32 versionHash;
        bytes32 snapshotSha256;
        bytes32 evidenceRoot;
        bytes32 relationshipRoot;
        bytes32 previousPublicationId;
        bytes32 manifestUriSha256;
        bytes32 snapshotRevocationReasonSha256;
        address publisher;
        address snapshotRevokedBy;
        uint64 evidenceCount;
        uint64 relationshipCount;
        uint64 createdAt;
        uint64 reviewedAt;
        uint64 publishedAt;
        uint64 snapshotRevokedAt;
        PublicationState state;
    }

    struct ItemRevocation {
        bytes32 originPublicationId;
        bytes32 originPayloadSha256;
        bytes32 reasonSha256;
        address revokedBy;
        uint64 revokedAt;
    }

    error EmptyNamespace();
    error NamespaceTooLong(uint256 supplied, uint256 maximum);
    error ZeroAddress();
    error InvalidPredecessorBinding(address registry, bytes32 publicationId);
    error PredecessorNamespaceMismatch(bytes32 expected, bytes32 actual);
    error UnknownPredecessorPublication(bytes32 publicationId);
    error PredecessorHeadMismatch(bytes32 expected, bytes32 supplied);
    error LineageTooDeep(uint256 supplied, uint256 maximum);
    error PublicationFrozen(address successorRegistry);
    error InvalidHash(string field);
    error InvalidRootCount(bytes32 root, uint64 count);
    error EmptyPublication();
    error InvalidTimestampOrder(uint64 createdAt, uint64 reviewedAt, uint64 currentTimestamp);
    error ManifestURIRequired();
    error ManifestURITooLong(uint256 supplied, uint256 maximum);
    error PreviousPublicationMismatch(bytes32 expected, bytes32 supplied);
    error VersionAlreadyPublished(bytes32 versionHash, bytes32 publicationId);
    error PublicationAlreadyExists(bytes32 publicationId);
    error UnknownPublication(bytes32 publicationId);
    error PublicationAlreadyRevoked(bytes32 publicationId);
    error UnauthorizedRevoker(address account, bytes32 publicationId);
    error ReasonRequired();
    error InvalidInclusionProof(bytes32 publicationId, SubjectKind kind, bytes32 idHash);
    error ProofTooLong(uint256 supplied, uint256 maximum);
    error ItemAlreadyRevoked(SubjectKind kind, bytes32 idHash);
    error SuccessorAlreadyConfirmed(address successorRegistry);
    error InvalidSuccessor(address successorRegistry);
    error SuccessorPredecessorMismatch(address expectedRegistry, bytes32 expectedPublicationId);

    event SnapshotPublished(
        bytes32 indexed publicationId,
        bytes32 indexed portableSnapshotId,
        bytes32 indexed versionHash,
        bytes32 snapshotSha256,
        bytes32 evidenceRoot,
        bytes32 relationshipRoot,
        uint64 evidenceCount,
        uint64 relationshipCount,
        bytes32 previousPublicationId,
        address publisher,
        uint64 publishedAt,
        bytes32 manifestUriSha256
    );
    event SnapshotRevoked(
        bytes32 indexed publicationId, address indexed revoker, bytes32 indexed reasonSha256, uint64 revokedAt
    );
    event EvidenceRevoked(
        bytes32 indexed idHash,
        bytes32 indexed originPublicationId,
        bytes32 originPayloadSha256,
        address revoker,
        bytes32 reasonSha256,
        uint64 revokedAt
    );
    event RelationshipRevoked(
        bytes32 indexed idHash,
        bytes32 indexed originPublicationId,
        bytes32 originPayloadSha256,
        address revoker,
        bytes32 reasonSha256,
        uint64 revokedAt
    );
    event SuccessorConfirmed(
        bytes32 indexed predecessorDeploymentId,
        bytes32 indexed successorDeploymentId,
        address indexed successorRegistry,
        bytes32 predecessorPublicationId
    );

    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");
    bytes32 public constant REVOCER_ROLE = keccak256("REVOCER_ROLE");
    uint256 public constant REGISTRY_PROTOCOL_VERSION = 1;

    bytes32 public constant SNAPSHOT_ID_DOMAIN = sha256("monad-city:registry:snapshot-id:v1");
    bytes32 public constant PUBLICATION_ID_DOMAIN = sha256("monad-city:registry:publication-id:v1");
    bytes32 public constant DEPLOYMENT_ID_DOMAIN = sha256("monad-city:registry:deployment-id:v1");
    bytes32 public constant EVIDENCE_LEAF_DOMAIN = sha256("monad-city:registry:evidence-leaf:v1");
    bytes32 public constant EVIDENCE_NODE_DOMAIN = sha256("monad-city:registry:evidence-node:v1");
    bytes32 public constant RELATIONSHIP_LEAF_DOMAIN = sha256("monad-city:registry:relationship-leaf:v1");
    bytes32 public constant RELATIONSHIP_NODE_DOMAIN = sha256("monad-city:registry:relationship-node:v1");

    uint256 public constant MAX_NAMESPACE_BYTES = 128;
    uint256 public constant MAX_MANIFEST_URI_BYTES = 512;
    uint256 public constant MAX_PROOF_LENGTH = 64;
    uint256 public constant MAX_LINEAGE_DEPTH = 32;

    bytes32 public immutable namespaceId;
    bytes32 public immutable deploymentId;
    address public immutable predecessorRegistry;
    bytes32 public immutable predecessorPublicationId;
    uint16 public immutable lineageDepth;

    address public successorRegistry;
    bool public publicationFrozen;
    bytes32 public headPublicationId;

    mapping(bytes32 publicationId => Publication publication) private _publications;
    mapping(bytes32 publicationId => string uri) private _manifestURIs;
    mapping(bytes32 versionHash => bytes32 publicationId) private _publicationIdByVersionHash;
    mapping(SubjectKind kind => mapping(bytes32 idHash => ItemRevocation revocation)) private _itemRevocations;

    constructor(
        string memory namespace,
        address initialAdmin,
        uint48 initialAdminDelay,
        address initialPublisher,
        address initialRevoker,
        address predecessorRegistry_,
        bytes32 predecessorPublicationId_
    ) AccessControlDefaultAdminRules(initialAdminDelay, initialAdmin) {
        uint256 namespaceLength = bytes(namespace).length;
        if (namespaceLength == 0) revert EmptyNamespace();
        if (namespaceLength > MAX_NAMESPACE_BYTES) {
            revert NamespaceTooLong(namespaceLength, MAX_NAMESPACE_BYTES);
        }
        if (initialPublisher == address(0) || initialRevoker == address(0)) revert ZeroAddress();

        bytes32 namespaceId_ = sha256(bytes(namespace));
        namespaceId = namespaceId_;
        deploymentId = sha256(
            abi.encodePacked(
                DEPLOYMENT_ID_DOMAIN, bytes32(block.chainid), bytes32(uint256(uint160(address(this)))), namespaceId_
            )
        );

        bool hasPredecessorRegistry = predecessorRegistry_ != address(0);
        bool hasPredecessorPublication = predecessorPublicationId_ != bytes32(0);
        if (hasPredecessorRegistry != hasPredecessorPublication) {
            revert InvalidPredecessorBinding(predecessorRegistry_, predecessorPublicationId_);
        }
        uint16 lineageDepth_;
        if (hasPredecessorRegistry) {
            if (predecessorRegistry_.code.length == 0) {
                revert InvalidPredecessorBinding(predecessorRegistry_, predecessorPublicationId_);
            }
            IMonadCityRegistryLineage predecessor = IMonadCityRegistryLineage(predecessorRegistry_);
            bytes32 predecessorNamespaceId = predecessor.namespaceId();
            if (predecessorNamespaceId != namespaceId_) {
                revert PredecessorNamespaceMismatch(namespaceId_, predecessorNamespaceId);
            }
            if (!predecessor.publicationExists(predecessorPublicationId_)) {
                revert UnknownPredecessorPublication(predecessorPublicationId_);
            }
            bytes32 predecessorHead = predecessor.headPublicationId();
            if (predecessorPublicationId_ != predecessorHead) {
                revert PredecessorHeadMismatch(predecessorHead, predecessorPublicationId_);
            }
            uint16 predecessorDepth = predecessor.lineageDepth();
            uint256 nextLineageDepth = uint256(predecessorDepth) + 1;
            if (nextLineageDepth > MAX_LINEAGE_DEPTH) {
                revert LineageTooDeep(nextLineageDepth, MAX_LINEAGE_DEPTH);
            }
            lineageDepth_ = predecessorDepth + 1;
        }

        predecessorRegistry = predecessorRegistry_;
        predecessorPublicationId = predecessorPublicationId_;
        lineageDepth = lineageDepth_;
        _grantRole(PUBLISHER_ROLE, initialPublisher);
        _grantRole(REVOCER_ROLE, initialRevoker);
    }

    /// @notice Publish a new immutable snapshot commitment and make it the local head.
    function publish(PublicationInput calldata input)
        external
        onlyRole(PUBLISHER_ROLE)
        returns (bytes32 publicationId)
    {
        if (publicationFrozen) revert PublicationFrozen(successorRegistry);
        _requireNonzeroHash(input.versionHash, "versionHash");
        _requireNonzeroHash(input.snapshotSha256, "snapshotSha256");
        _validateRootCount(input.evidenceRoot, input.evidenceCount);
        _validateRootCount(input.relationshipRoot, input.relationshipCount);
        if (input.evidenceCount == 0 && input.relationshipCount == 0) revert EmptyPublication();
        // Release metadata may be old, but a publication must not anchor a review dated in the future.
        // forge-lint: disable-next-line(block-timestamp)
        if (input.createdAt == 0 || input.createdAt > input.reviewedAt || input.reviewedAt > block.timestamp) {
            revert InvalidTimestampOrder(input.createdAt, input.reviewedAt, uint64(block.timestamp));
        }

        uint256 manifestLength = bytes(input.manifestURI).length;
        if (manifestLength == 0) revert ManifestURIRequired();
        if (manifestLength > MAX_MANIFEST_URI_BYTES) {
            revert ManifestURITooLong(manifestLength, MAX_MANIFEST_URI_BYTES);
        }
        if (input.previousPublicationId != headPublicationId) {
            revert PreviousPublicationMismatch(headPublicationId, input.previousPublicationId);
        }

        bytes32 existingVersionPublication = _publicationIdByVersionHash[input.versionHash];
        if (existingVersionPublication != bytes32(0)) {
            revert VersionAlreadyPublished(input.versionHash, existingVersionPublication);
        }

        bytes32 portableSnapshotId = computePortableSnapshotId(input.versionHash, input.snapshotSha256);
        publicationId = computePublicationId(portableSnapshotId);
        if (_publications[publicationId].state != PublicationState.Unknown) {
            revert PublicationAlreadyExists(publicationId);
        }

        bytes32 oldHead = headPublicationId;
        if (oldHead != bytes32(0) && _publications[oldHead].state == PublicationState.Active) {
            _publications[oldHead].state = PublicationState.Superseded;
        }

        uint64 publishedAt = uint64(block.timestamp);
        bytes32 manifestUriSha256 = sha256(bytes(input.manifestURI));
        _publications[publicationId] = Publication({
            portableSnapshotId: portableSnapshotId,
            versionHash: input.versionHash,
            snapshotSha256: input.snapshotSha256,
            evidenceRoot: input.evidenceRoot,
            relationshipRoot: input.relationshipRoot,
            previousPublicationId: input.previousPublicationId,
            manifestUriSha256: manifestUriSha256,
            snapshotRevocationReasonSha256: bytes32(0),
            publisher: msg.sender,
            snapshotRevokedBy: address(0),
            evidenceCount: input.evidenceCount,
            relationshipCount: input.relationshipCount,
            createdAt: input.createdAt,
            reviewedAt: input.reviewedAt,
            publishedAt: publishedAt,
            snapshotRevokedAt: 0,
            state: PublicationState.Active
        });
        _manifestURIs[publicationId] = input.manifestURI;
        _publicationIdByVersionHash[input.versionHash] = publicationId;
        headPublicationId = publicationId;

        emit SnapshotPublished(
            publicationId,
            portableSnapshotId,
            input.versionHash,
            input.snapshotSha256,
            input.evidenceRoot,
            input.relationshipRoot,
            input.evidenceCount,
            input.relationshipCount,
            input.previousPublicationId,
            msg.sender,
            publishedAt,
            manifestUriSha256
        );
    }

    /// @notice Permanently revoke one publication. Its historical commitments remain readable.
    function revokeSnapshot(bytes32 publicationId, bytes32 reasonSha256) external {
        Publication storage publication = _requirePublication(publicationId);
        _checkRevoker(publicationId, publication.publisher);
        if (reasonSha256 == bytes32(0)) revert ReasonRequired();
        if (publication.snapshotRevokedAt != 0) revert PublicationAlreadyRevoked(publicationId);

        uint64 revokedAt = uint64(block.timestamp);
        publication.snapshotRevokedAt = revokedAt;
        publication.snapshotRevokedBy = msg.sender;
        publication.snapshotRevocationReasonSha256 = reasonSha256;
        publication.state = PublicationState.Revoked;
        emit SnapshotRevoked(publicationId, msg.sender, reasonSha256, revokedAt);
    }

    /// @notice Permanently revoke an evidence ID for this namespace after proving one exact committed occurrence.
    function revokeEvidence(
        bytes32 publicationId,
        bytes32 idHash,
        bytes32 payloadSha256,
        bytes32[] calldata proof,
        bytes32 reasonSha256
    ) external onlyRole(REVOCER_ROLE) {
        _revokeItem(publicationId, SubjectKind.Evidence, idHash, payloadSha256, proof, reasonSha256);
    }

    /// @notice Permanently revoke a relationship ID for this namespace after proving one exact committed occurrence.
    function revokeRelationship(
        bytes32 publicationId,
        bytes32 idHash,
        bytes32 payloadSha256,
        bytes32[] calldata proof,
        bytes32 reasonSha256
    ) external onlyRole(REVOCER_ROLE) {
        _revokeItem(publicationId, SubjectKind.Relationship, idHash, payloadSha256, proof, reasonSha256);
    }

    /// @notice Confirm a reciprocal successor and permanently freeze new publications in this deployment.
    function confirmSuccessor(address newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (successorRegistry != address(0)) revert SuccessorAlreadyConfirmed(successorRegistry);
        if (newRegistry == address(0) || newRegistry == address(this) || newRegistry.code.length == 0) {
            revert InvalidSuccessor(newRegistry);
        }
        bytes32 currentHead = headPublicationId;
        if (currentHead == bytes32(0)) revert UnknownPublication(bytes32(0));

        IMonadCityRegistryLineage successor = IMonadCityRegistryLineage(newRegistry);
        bytes32 successorNamespaceId = successor.namespaceId();
        if (successorNamespaceId != namespaceId) {
            revert PredecessorNamespaceMismatch(namespaceId, successorNamespaceId);
        }
        if (successor.predecessorRegistry() != address(this) || successor.predecessorPublicationId() != currentHead) {
            revert SuccessorPredecessorMismatch(address(this), currentHead);
        }
        bytes32 successorHead = successor.headPublicationId();
        if (
            successorHead == bytes32(0) || !successor.publicationExists(successorHead)
                || !successor.isPublicationActive(successorHead)
        ) {
            revert InvalidSuccessor(newRegistry);
        }

        successorRegistry = newRegistry;
        publicationFrozen = true;
        if (_publications[currentHead].state == PublicationState.Active) {
            _publications[currentHead].state = PublicationState.Superseded;
        }
        emit SuccessorConfirmed(deploymentId, successor.deploymentId(), newRegistry, currentHead);
    }

    function getPublication(bytes32 publicationId) external view returns (Publication memory) {
        return _publications[publicationId];
    }

    function manifestURI(bytes32 publicationId) external view returns (string memory) {
        return _manifestURIs[publicationId];
    }

    function publicationIdForVersion(bytes32 versionHash) external view returns (bytes32) {
        return _publicationIdByVersionHash[versionHash];
    }

    function publicationExists(bytes32 publicationId) public view returns (bool) {
        return _publications[publicationId].state != PublicationState.Unknown;
    }

    function isPublicationActive(bytes32 publicationId) public view returns (bool) {
        return _publications[publicationId].state == PublicationState.Active;
    }

    function publicationStatus(bytes32 publicationId)
        external
        view
        returns (PublicationState state, bool exists, bool active, bool snapshotRevoked)
    {
        Publication storage publication = _publications[publicationId];
        state = publication.state;
        exists = state != PublicationState.Unknown;
        active = state == PublicationState.Active;
        snapshotRevoked = publication.snapshotRevokedAt != 0;
    }

    function isItemRevoked(SubjectKind kind, bytes32 idHash) public view returns (bool) {
        if (_itemRevocations[kind][idHash].revokedAt != 0) return true;
        if (predecessorRegistry == address(0)) return false;
        return IMonadCityRegistryLineage(predecessorRegistry).isItemRevoked(uint8(kind), idHash);
    }

    function getItemRevocation(SubjectKind kind, bytes32 idHash) external view returns (ItemRevocation memory) {
        return _itemRevocations[kind][idHash];
    }

    function verifyEvidence(bytes32 publicationId, bytes32 idHash, bytes32 payloadSha256, bytes32[] calldata proof)
        external
        view
        returns (bool included, bool publicationActive, bool snapshotRevoked, bool itemRevoked)
    {
        return _verify(publicationId, SubjectKind.Evidence, idHash, payloadSha256, proof);
    }

    function verifyRelationship(bytes32 publicationId, bytes32 idHash, bytes32 payloadSha256, bytes32[] calldata proof)
        external
        view
        returns (bool included, bool publicationActive, bool snapshotRevoked, bool itemRevoked)
    {
        return _verify(publicationId, SubjectKind.Relationship, idHash, payloadSha256, proof);
    }

    function computePortableSnapshotId(bytes32 versionHash, bytes32 snapshotSha256) public view returns (bytes32) {
        return sha256(abi.encodePacked(SNAPSHOT_ID_DOMAIN, namespaceId, versionHash, snapshotSha256));
    }

    function computePublicationId(bytes32 portableSnapshotId) public view returns (bytes32) {
        return sha256(
            abi.encodePacked(
                PUBLICATION_ID_DOMAIN,
                bytes32(block.chainid),
                bytes32(uint256(uint160(address(this)))),
                portableSnapshotId
            )
        );
    }

    function computeEvidenceLeaf(bytes32 portableSnapshotId, bytes32 idHash, bytes32 payloadSha256)
        public
        view
        returns (bytes32)
    {
        return sha256(abi.encodePacked(EVIDENCE_LEAF_DOMAIN, namespaceId, portableSnapshotId, idHash, payloadSha256));
    }

    function computeRelationshipLeaf(bytes32 portableSnapshotId, bytes32 idHash, bytes32 payloadSha256)
        public
        view
        returns (bytes32)
    {
        return sha256(
            abi.encodePacked(RELATIONSHIP_LEAF_DOMAIN, namespaceId, portableSnapshotId, idHash, payloadSha256)
        );
    }

    function processEvidenceProof(bytes32 leaf, bytes32[] calldata proof) public pure returns (bytes32) {
        return _processProof(EVIDENCE_NODE_DOMAIN, leaf, proof);
    }

    function processRelationshipProof(bytes32 leaf, bytes32[] calldata proof) public pure returns (bytes32) {
        return _processProof(RELATIONSHIP_NODE_DOMAIN, leaf, proof);
    }

    function computeVersionHash(string calldata version) external pure returns (bytes32) {
        return sha256(bytes(version));
    }

    function computeIdHash(string calldata subjectId) external pure returns (bytes32) {
        return sha256(bytes(subjectId));
    }

    function _revokeItem(
        bytes32 publicationId,
        SubjectKind kind,
        bytes32 idHash,
        bytes32 payloadSha256,
        bytes32[] calldata proof,
        bytes32 reasonSha256
    ) private {
        Publication storage publication = _requirePublication(publicationId);
        if (reasonSha256 == bytes32(0)) revert ReasonRequired();
        _requireNonzeroHash(idHash, "idHash");
        _requireNonzeroHash(payloadSha256, "payloadSha256");
        if (isItemRevoked(kind, idHash)) revert ItemAlreadyRevoked(kind, idHash);

        bytes32 leaf = kind == SubjectKind.Evidence
            ? computeEvidenceLeaf(publication.portableSnapshotId, idHash, payloadSha256)
            : computeRelationshipLeaf(publication.portableSnapshotId, idHash, payloadSha256);
        bytes32 root = kind == SubjectKind.Evidence ? publication.evidenceRoot : publication.relationshipRoot;
        bytes32 rebuiltRoot =
            kind == SubjectKind.Evidence ? processEvidenceProof(leaf, proof) : processRelationshipProof(leaf, proof);
        if (rebuiltRoot != root) revert InvalidInclusionProof(publicationId, kind, idHash);

        uint64 revokedAt = uint64(block.timestamp);
        _itemRevocations[kind][idHash] = ItemRevocation({
            originPublicationId: publicationId,
            originPayloadSha256: payloadSha256,
            reasonSha256: reasonSha256,
            revokedBy: msg.sender,
            revokedAt: revokedAt
        });
        if (kind == SubjectKind.Evidence) {
            emit EvidenceRevoked(idHash, publicationId, payloadSha256, msg.sender, reasonSha256, revokedAt);
        } else {
            emit RelationshipRevoked(idHash, publicationId, payloadSha256, msg.sender, reasonSha256, revokedAt);
        }
    }

    function _verify(
        bytes32 publicationId,
        SubjectKind kind,
        bytes32 idHash,
        bytes32 payloadSha256,
        bytes32[] calldata proof
    ) private view returns (bool included, bool publicationActive, bool snapshotRevoked, bool itemRevoked) {
        Publication storage publication = _publications[publicationId];
        if (publication.state == PublicationState.Unknown) return (false, false, false, false);

        bytes32 leaf = kind == SubjectKind.Evidence
            ? computeEvidenceLeaf(publication.portableSnapshotId, idHash, payloadSha256)
            : computeRelationshipLeaf(publication.portableSnapshotId, idHash, payloadSha256);
        bytes32 root = kind == SubjectKind.Evidence ? publication.evidenceRoot : publication.relationshipRoot;
        bytes32 rebuiltRoot =
            kind == SubjectKind.Evidence ? processEvidenceProof(leaf, proof) : processRelationshipProof(leaf, proof);

        included = root != bytes32(0) && rebuiltRoot == root;
        publicationActive = publication.state == PublicationState.Active;
        snapshotRevoked = publication.snapshotRevokedAt != 0;
        itemRevoked = isItemRevoked(kind, idHash);
    }

    function _processProof(bytes32 nodeDomain, bytes32 leaf, bytes32[] calldata proof)
        private
        pure
        returns (bytes32 computedHash)
    {
        if (proof.length > MAX_PROOF_LENGTH) revert ProofTooLong(proof.length, MAX_PROOF_LENGTH);
        computedHash = leaf;
        for (uint256 i; i < proof.length; ++i) {
            bytes32 sibling = proof[i];
            (bytes32 left, bytes32 right) = computedHash < sibling ? (computedHash, sibling) : (sibling, computedHash);
            computedHash = sha256(abi.encodePacked(nodeDomain, left, right));
        }
    }

    function _requirePublication(bytes32 publicationId) private view returns (Publication storage publication) {
        publication = _publications[publicationId];
        if (publication.state == PublicationState.Unknown) revert UnknownPublication(publicationId);
    }

    function _checkRevoker(bytes32 publicationId, address publisher) private view {
        if (msg.sender != publisher && !hasRole(REVOCER_ROLE, msg.sender)) {
            revert UnauthorizedRevoker(msg.sender, publicationId);
        }
    }

    function _requireNonzeroHash(bytes32 value, string memory field) private pure {
        if (value == bytes32(0)) revert InvalidHash(field);
    }

    function _validateRootCount(bytes32 root, uint64 count) private pure {
        if ((count == 0) != (root == bytes32(0))) revert InvalidRootCount(root, count);
    }
}
