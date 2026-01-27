// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import {NILFaucet} from "../src/NILFaucet.sol";

contract DeployFaucet is Script {
    function run() external returns (NILFaucet faucet) {
        address token = vm.envAddress("NIL_TOKEN_ADDRESS");
        uint256 dripAmount = vm.envOr("DRIP_AMOUNT", uint256(1e6)); // 1 NIL default
        uint256 cooldownSeconds = vm.envOr("COOLDOWN_SECONDS", uint256(1 hours));

        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        faucet = new NILFaucet(token, dripAmount, cooldownSeconds, owner);

        vm.stopBroadcast();

        console2.log("Deployed NILFaucet at:", address(faucet));
        console2.log("Owner:", owner);
    }
}
