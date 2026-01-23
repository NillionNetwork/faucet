// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @custom:security-contact security@nillion.com
contract NILFaucet is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable token;
    uint256 public dripAmount; // token smallest units
    uint256 public cooldownSeconds; // seconds between claims per address
    mapping(address => uint256) public lastClaimAt;
    mapping(address => uint256) public claimCount;

    event Claimed(address indexed claimer, uint256 amount);
    event DripAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldownSeconds);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address tokenAddress, uint256 _dripAmount, uint256 _cooldownSeconds, address initialOwner)
        Ownable(initialOwner)
    {
        require(tokenAddress != address(0), "BAD_TOKEN");
        token = IERC20(tokenAddress);
        dripAmount = _dripAmount;
        cooldownSeconds = _cooldownSeconds;
    }

    function setDripAmount(uint256 _dripAmount) external onlyOwner {
        dripAmount = _dripAmount;
        emit DripAmountUpdated(_dripAmount);
    }

    function setCooldown(uint256 _cooldownSeconds) external onlyOwner {
        cooldownSeconds = _cooldownSeconds;
        emit CooldownUpdated(_cooldownSeconds);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function faucetBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function canClaim(address user) public view returns (bool ok, string memory reason) {
        if (paused()) return (false, "PAUSED");
        if (dripAmount == 0) return (false, "DRIP_0");
        if (faucetBalance() < dripAmount) return (false, "EMPTY");
        if (cooldownSeconds > 0) {
            uint256 last = lastClaimAt[user];
            if (last != 0 && block.timestamp < last + cooldownSeconds) {
                return (false, "COOLDOWN");
            }
        }

        return (true, "");
    }

    function claim() external whenNotPaused nonReentrant {
        (bool ok, string memory reason) = canClaim(msg.sender);
        require(ok, reason);
        lastClaimAt[msg.sender] = block.timestamp;
        claimCount[msg.sender] += 1;
        token.safeTransfer(msg.sender, dripAmount);
        emit Claimed(msg.sender, dripAmount);
    }

    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "BAD_TO");
        token.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }
}
