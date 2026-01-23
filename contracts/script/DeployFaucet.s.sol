// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import {NILFaucet} from "../src/NILFaucet.sol";

contract DeployFaucet is Script {
    // NIL Token address
    address constant TOKEN = 0xfa718d54f31bcf49CcaC3a79C276fa87d11E2F44;

    function run() external returns (NILFaucet faucet) {
        // NIL uses 6 decimals
        uint256 dripAmount = 100e6;
        uint256 cooldownSeconds = 24 hours;
        // -----------------------------

        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        faucet = new NILFaucet(TOKEN, dripAmount, cooldownSeconds, owner);

        vm.stopBroadcast();

        console2.log("Deployed NILFaucet at:", address(faucet));
        console2.log("Owner:", owner);
    }
}
