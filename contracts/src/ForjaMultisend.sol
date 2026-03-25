// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ForjaMultisend is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public multisendFee;
    uint256 public constant MAX_RECIPIENTS = 500;

    event MultisendExecuted(address indexed sender, address indexed token, uint256 recipientCount, uint256 totalAmount);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error ZeroAddress();
    error EmptyRecipients();
    error MismatchedArrays();
    error TooManyRecipients();

    constructor(
        address _usdc,
        address _treasury,
        uint256 _multisendFee
    ) Ownable(msg.sender) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
        multisendFee = _multisendFee;
    }

    function multisendToken(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        if (recipients.length == 0) revert EmptyRecipients();
        if (recipients.length != amounts.length) revert MismatchedArrays();
        if (recipients.length > MAX_RECIPIENTS) revert TooManyRecipients();

        usdc.safeTransferFrom(msg.sender, treasury, multisendFee);

        IERC20 sendToken = IERC20(token);
        uint256 totalAmount;

        for (uint256 i; i < recipients.length; ++i) {
            totalAmount += amounts[i];
            sendToken.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
        }

        emit MultisendExecuted(msg.sender, token, recipients.length, totalAmount);
    }

    function setMultisendFee(
        uint256 _fee
    ) external onlyOwner {
        emit FeeUpdated(multisendFee, _fee);
        multisendFee = _fee;
    }

    function setTreasury(
        address _treasury
    ) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
}
