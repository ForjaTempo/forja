// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal Permit2 SignatureTransfer interface used by ForjaSwapRouter.
/// Full reference: github.com/Uniswap/permit2

interface IPermit2 {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}
