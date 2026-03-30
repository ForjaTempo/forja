// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaTokenFactory} from "../src/ForjaTokenFactory.sol";
import {ITIP20} from "../src/interfaces/ITIP20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockTIP20} from "./mocks/MockTIP20.sol";
import {MockTIP20Factory} from "./mocks/MockTIP20Factory.sol";

contract ForjaTokenFactoryTest is Test {
    ForjaTokenFactory public factory;
    MockERC20 public usdc;
    MockTIP20Factory public tipFactory;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant CREATE_FEE = 20e6; // 20 USDC

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        tipFactory = new MockTIP20Factory();
        factory = new ForjaTokenFactory(address(tipFactory), address(usdc), address(usdc), treasury, CREATE_FEE);

        usdc.mint(alice, 1000e6);
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
    }

    function test_createToken_success() public {
        vm.prank(alice);
        address token = factory.createToken("Test Token", "TEST", 1_000_000e6);

        assertTrue(token != address(0));
        assertEq(MockTIP20(token).totalSupply(), 1_000_000e6);
        assertEq(MockTIP20(token).balanceOf(alice), 1_000_000e6);
    }

    function test_createToken_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit ForjaTokenFactory.TokenCreated(alice, address(0), "Test Token", "TEST", 1000e6);
        factory.createToken("Test Token", "TEST", 1000e6);
    }

    function test_createToken_transfersFeeToTreasury() public {
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(alice);
        factory.createToken("Test Token", "TEST", 1000e6);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + CREATE_FEE);
    }

    function test_createToken_mintsToCreator() public {
        vm.prank(alice);
        address token = factory.createToken("Test Token", "TEST", 5000e6);
        assertEq(MockTIP20(token).balanceOf(alice), 5000e6);
    }

    function test_createToken_transfersAdminRole() public {
        vm.prank(alice);
        address token = factory.createToken("Test Token", "TEST", 1000e6);

        bytes32 adminRole = MockTIP20(token).DEFAULT_ADMIN_ROLE();
        assertTrue(MockTIP20(token).hasRole(adminRole, alice));
    }

    function test_createToken_contractRenouncesRoles() public {
        vm.prank(alice);
        address token = factory.createToken("Test Token", "TEST", 1000e6);

        bytes32 adminRole = MockTIP20(token).DEFAULT_ADMIN_ROLE();
        bytes32 issuerRole = MockTIP20(token).ISSUER_ROLE();

        assertFalse(MockTIP20(token).hasRole(adminRole, address(factory)));
        assertFalse(MockTIP20(token).hasRole(issuerRole, address(factory)));
    }

    function test_createToken_zeroInitialSupply() public {
        vm.prank(alice);
        address token = factory.createToken("Test Token", "TEST", 0);

        assertTrue(token != address(0));
        assertEq(MockTIP20(token).totalSupply(), 0);
    }

    function test_createToken_revertsWithoutApproval() public {
        vm.prank(bob);
        vm.expectRevert();
        factory.createToken("Test Token", "TEST", 1000e6);
    }

    function test_createToken_revertsInsufficientBalance() public {
        usdc.mint(bob, 1e6); // Only 1 USDC, need 20
        vm.startPrank(bob);
        usdc.approve(address(factory), type(uint256).max);
        vm.expectRevert();
        factory.createToken("Test Token", "TEST", 1000e6);
        vm.stopPrank();
    }

    function test_setCreateFee_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.setCreateFee(50e6);
    }

    function test_setCreateFee_updatesValue() public {
        factory.setCreateFee(50e6);
        assertEq(factory.createFee(), 50e6);
    }

    function test_setCreateFee_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaTokenFactory.FeeUpdated(CREATE_FEE, 50e6);
        factory.setCreateFee(50e6);
    }

    function test_setTreasury_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.setTreasury(bob);
    }

    function test_setTreasury_rejectsZeroAddress() public {
        vm.expectRevert(ForjaTokenFactory.ZeroAddress.selector);
        factory.setTreasury(address(0));
    }

    function test_setTreasury_updatesValue() public {
        factory.setTreasury(bob);
        assertEq(factory.treasury(), bob);
    }

    function test_createToken_incrementsNonce() public {
        assertEq(factory.userNonce(alice), 0);
        vm.prank(alice);
        factory.createToken("Token 1", "T1", 1000e6);
        assertEq(factory.userNonce(alice), 1);

        usdc.mint(alice, 1000e6);
        vm.prank(alice);
        factory.createToken("Token 2", "T2", 1000e6);
        assertEq(factory.userNonce(alice), 2);
    }

    function testFuzz_createToken_variousFees(
        uint256 fee
    ) public {
        fee = bound(fee, 0, 100e6);
        factory.setCreateFee(fee);

        usdc.mint(bob, fee);
        vm.startPrank(bob);
        usdc.approve(address(factory), type(uint256).max);
        address token = factory.createToken("Fuzz Token", "FUZZ", 1000e6);
        vm.stopPrank();

        assertTrue(token != address(0));
        assertEq(usdc.balanceOf(treasury), fee);
    }

    function test_constructor_rejectsZeroFactory() public {
        vm.expectRevert(ForjaTokenFactory.ZeroAddress.selector);
        new ForjaTokenFactory(address(0), address(usdc), address(usdc), treasury, CREATE_FEE);
    }

    function test_constructor_rejectsZeroUsdc() public {
        vm.expectRevert(ForjaTokenFactory.ZeroAddress.selector);
        new ForjaTokenFactory(address(tipFactory), address(0), address(usdc), treasury, CREATE_FEE);
    }

    function test_constructor_rejectsZeroPathUsd() public {
        vm.expectRevert(ForjaTokenFactory.ZeroAddress.selector);
        new ForjaTokenFactory(address(tipFactory), address(usdc), address(0), treasury, CREATE_FEE);
    }

    function test_constructor_rejectsZeroTreasury() public {
        vm.expectRevert(ForjaTokenFactory.ZeroAddress.selector);
        new ForjaTokenFactory(address(tipFactory), address(usdc), address(usdc), address(0), CREATE_FEE);
    }

    function test_setTreasury_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaTokenFactory.TreasuryUpdated(treasury, bob);
        factory.setTreasury(bob);
    }

    function test_createToken_uniqueTokenPerCall() public {
        usdc.mint(alice, 1000e6);
        vm.prank(alice);
        address token1 = factory.createToken("Token A", "TA", 1000e6);
        vm.prank(alice);
        address token2 = factory.createToken("Token B", "TB", 1000e6);
        assertTrue(token1 != token2);
    }

    function test_createToken_zeroFeeWorks() public {
        factory.setCreateFee(0);
        vm.prank(bob);
        address token = factory.createToken("Free Token", "FREE", 1000e6);
        assertTrue(token != address(0));
    }

    function test_createToken_roleTransferVerified() public {
        vm.prank(alice);
        address token = factory.createToken("Test Token", "TEST", 1000e6);

        bytes32 adminRole = MockTIP20(token).DEFAULT_ADMIN_ROLE();
        bytes32 issuerRole = MockTIP20(token).ISSUER_ROLE();

        assertTrue(MockTIP20(token).hasRole(adminRole, alice));
        assertFalse(MockTIP20(token).hasRole(issuerRole, address(factory)));
        assertFalse(MockTIP20(token).hasRole(adminRole, address(factory)));
    }

    function test_createToken_passesUsdCurrency() public {
        vm.prank(alice);
        address token = factory.createToken("Test", "TST", 1000e6);
        assertEq(MockTIP20(token).currency(), "USD");
    }

    function test_createToken_passesPathUsdAsQuoteToken() public {
        vm.prank(alice);
        address token = factory.createToken("Test", "TST", 1000e6);
        assertEq(MockTIP20(token).quoteToken(), address(usdc));
    }
}
