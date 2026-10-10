// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { MonadCityRegistry } from "../src/MonadCityRegistry.sol";

interface MigrationVm {
    function envAddress(string calldata name) external view returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Builds the irreversible predecessor-freeze transaction after the successor is populated and reviewed.
contract ConfirmSuccessor {
    MigrationVm private constant vm = MigrationVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        MonadCityRegistry predecessor = MonadCityRegistry(vm.envAddress("REGISTRY_PREDECESSOR"));
        address successor = vm.envAddress("REGISTRY_SUCCESSOR");
        vm.startBroadcast();
        predecessor.confirmSuccessor(successor);
        vm.stopBroadcast();
    }
}
