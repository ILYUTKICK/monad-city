// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { MonadCityRegistry } from "../src/MonadCityRegistry.sol";

interface DeploymentVm {
    function envAddress(string calldata name) external view returns (address value);
    function envBytes32(string calldata name) external view returns (bytes32 value);
    function envOr(string calldata name, address defaultValue) external view returns (address value);
    function envOr(string calldata name, bytes32 defaultValue) external view returns (bytes32 value);
    function envUint(string calldata name) external view returns (uint256 value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deployment transaction builder. It never reads or embeds a private key.
/// @dev Run without --broadcast for simulation; an external operator chooses the signer and network.
contract DeployMonadCityRegistry {
    DeploymentVm private constant vm = DeploymentVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    string private constant NAMESPACE = "monad-city:registry:main:v1";

    function run() external returns (MonadCityRegistry registry) {
        address admin = vm.envAddress("REGISTRY_ADMIN");
        address publisher = vm.envAddress("REGISTRY_PUBLISHER");
        address revoker = vm.envAddress("REGISTRY_REVOKER");
        uint256 delay = vm.envUint("REGISTRY_ADMIN_DELAY_SECONDS");
        require(delay <= type(uint48).max, "admin delay exceeds uint48");

        address predecessor = vm.envOr("REGISTRY_PREDECESSOR", address(0));
        bytes32 predecessorPublication = vm.envOr("REGISTRY_PREDECESSOR_PUBLICATION", bytes32(0));
        // The explicit bound above proves this cast cannot truncate.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint48 adminDelay = uint48(delay);

        vm.startBroadcast();
        registry = new MonadCityRegistry(
            NAMESPACE, admin, adminDelay, publisher, revoker, predecessor, predecessorPublication
        );
        vm.stopBroadcast();
    }
}
