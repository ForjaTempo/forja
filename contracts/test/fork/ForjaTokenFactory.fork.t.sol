// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ForjaTokenFactory} from "../../src/ForjaTokenFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ITIP20} from "../../src/interfaces/ITIP20.sol";

/// @notice Fork tests for ForjaTokenFactory against Moderato testnet.
/// @dev These tests require Moderato RPC access and validate our contract
///      against the real TIP-20 Factory. They are excluded from CI via
///      `--no-match-path 'test/fork/*'`.
///
///      IMPORTANT: Tempo TIP-20 Factory (0x20Fc...) uses custom precompiled
///      opcodes that are NOT supported by Foundry's EVM. Fork tests will fail
///      with `OpcodeNotFound`. The actual validation MUST be done via a
///      real deployment + smoke test on Moderato testnet using:
///        forge script script/Deploy.s.sol --rpc-url moderato --broadcast
///
///      These tests are kept as reference for the expected behavior and will
///      pass once Foundry adds Tempo precompile support (or we use a Tempo-native
///      testing framework).
contract ForjaTokenFactoryForkTest is Test {
    // Moderato testnet addresses (same as mainnet)
    address constant TIP20_FACTORY = 0x20Fc000000000000000000000000000000000000;
    address constant PATHUSDC = 0x20C0000000000000000000000000000000000000;

    ForjaTokenFactory public factory;
    address public treasury;
    address public user;

    function setUp() public {
        vm.createSelectFork("moderato");
        treasury = makeAddr("treasury");
        user = makeAddr("user");
        factory = new ForjaTokenFactory(TIP20_FACTORY, PATHUSDC, PATHUSDC, treasury, 0);
    }

    /// @dev Skipped: Tempo TIP-20 Factory uses custom precompiled opcodes
    ///      not supported by Foundry EVM. Validate via real deployment instead.
    function skip_test_createToken_onRealFactory() public {
        vm.prank(user);
        address token = factory.createToken("Test Token", "TEST", 1_000_000e6);

        assertTrue(token != address(0), "Token address should not be zero");

        // Verify token metadata
        assertEq(ITIP20(token).name(), "Test Token");
        assertEq(ITIP20(token).symbol(), "TEST");
        assertEq(ITIP20(token).decimals(), 6);

        // Verify initial supply minted to user
        assertEq(ITIP20(token).balanceOf(user), 1_000_000e6);

        // Verify roles handed off correctly
        bytes32 adminRole = ITIP20(token).DEFAULT_ADMIN_ROLE();
        bytes32 issuerRole = ITIP20(token).ISSUER_ROLE();
        assertTrue(ITIP20(token).hasRole(adminRole, user));
        assertFalse(ITIP20(token).hasRole(adminRole, address(factory)));
        assertFalse(ITIP20(token).hasRole(issuerRole, address(factory)));
    }

    /// @dev Skipped: Same precompile limitation as above.
    function skip_test_createToken_zeroSupply() public {
        vm.prank(user);
        address token = factory.createToken("Zero Token", "ZERO", 0);
        assertTrue(token != address(0));
        assertEq(ITIP20(token).balanceOf(user), 0);
    }
}
