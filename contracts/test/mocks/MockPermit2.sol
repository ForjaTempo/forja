// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPermit2} from "../../src/interfaces/IPermit2.sol";

/// @notice Test-only Permit2 mock that skips signature verification and just
///         pulls tokens via the standard ERC-20 allowance set by the test.
///         Tests must `token.approve(mockPermit2, ...)` before calling the
///         router.
contract MockPermit2 is IPermit2 {
    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata /* signature */
    ) external {
        // We trust the caller and use a normal transferFrom — signature
        // verification is the responsibility of real Permit2 in production.
        IERC20(permit.permitted.token).transferFrom(owner, transferDetails.to, transferDetails.requestedAmount);
    }
}
