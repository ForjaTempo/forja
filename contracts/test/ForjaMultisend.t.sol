// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaMultisend} from "../src/ForjaMultisend.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ForjaMultisendTest is Test {
    ForjaMultisend public multisend;
    MockERC20 public usdc;
    MockERC20 public token;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");

    uint256 public constant MULTISEND_FEE = 3e6; // 3 USDC

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        token = new MockERC20("Test Token", "TEST", 6);
        multisend = new ForjaMultisend(address(usdc), treasury, MULTISEND_FEE);

        usdc.mint(alice, 1000e6);
        token.mint(alice, 1_000_000e6);

        vm.startPrank(alice);
        usdc.approve(address(multisend), type(uint256).max);
        token.approve(address(multisend), type(uint256).max);
        vm.stopPrank();
    }

    function _makeRecipients(
        uint256 count
    ) internal pure returns (address[] memory, uint256[] memory) {
        address[] memory recipients = new address[](count);
        uint256[] memory amounts = new uint256[](count);
        for (uint256 i; i < count; ++i) {
            recipients[i] = address(uint160(0x1000 + i));
            amounts[i] = 100e6;
        }
        return (recipients, amounts);
    }

    function test_multisend_success() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(5);

        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);

        for (uint256 i; i < 5; ++i) {
            assertEq(token.balanceOf(recipients[i]), 100e6);
        }
    }

    function test_multisend_emitsEvent() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(3);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit ForjaMultisend.MultisendExecuted(alice, address(token), 3, 300e6);
        multisend.multisendToken(address(token), recipients, amounts);
    }

    function test_multisend_transfersFee() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(2);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + MULTISEND_FEE);
    }

    function test_multisend_singleRecipient() public {
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = makeAddr("bob");
        amounts[0] = 500e6;

        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);
        assertEq(token.balanceOf(recipients[0]), 500e6);
    }

    function test_multisend_revertsEmptyRecipients() public {
        address[] memory recipients = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(alice);
        vm.expectRevert(ForjaMultisend.EmptyRecipients.selector);
        multisend.multisendToken(address(token), recipients, amounts);
    }

    function test_multisend_revertsMismatchedArrays() public {
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](3);
        recipients[0] = makeAddr("r1");
        recipients[1] = makeAddr("r2");
        amounts[0] = 100e6;
        amounts[1] = 100e6;
        amounts[2] = 100e6;

        vm.prank(alice);
        vm.expectRevert(ForjaMultisend.MismatchedArrays.selector);
        multisend.multisendToken(address(token), recipients, amounts);
    }

    function test_multisend_revertsExceedMaxRecipients() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(501);

        vm.prank(alice);
        vm.expectRevert(ForjaMultisend.TooManyRecipients.selector);
        multisend.multisendToken(address(token), recipients, amounts);
    }

    function test_multisend_revertsInsufficientTokenBalance() public {
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = makeAddr("bob");
        amounts[0] = 2_000_000e6; // More than alice has

        vm.prank(alice);
        vm.expectRevert();
        multisend.multisendToken(address(token), recipients, amounts);
    }

    function test_multisend_revertsInsufficientFeeBalance() public {
        address bob = makeAddr("bob");
        token.mint(bob, 1000e6);
        usdc.mint(bob, 1e6); // Only 1 USDC, need 3

        vm.startPrank(bob);
        token.approve(address(multisend), type(uint256).max);
        usdc.approve(address(multisend), type(uint256).max);

        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = makeAddr("recipient");
        amounts[0] = 100e6;

        vm.expectRevert();
        multisend.multisendToken(address(token), recipients, amounts);
        vm.stopPrank();
    }

    function test_multisend_revertsNoTokenApproval() public {
        address bob = makeAddr("bob");
        token.mint(bob, 1000e6);
        usdc.mint(bob, 100e6);

        vm.startPrank(bob);
        usdc.approve(address(multisend), type(uint256).max);
        // No token approval

        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = makeAddr("recipient");
        amounts[0] = 100e6;

        vm.expectRevert();
        multisend.multisendToken(address(token), recipients, amounts);
        vm.stopPrank();
    }

    function test_multisend_revertsNoFeeApproval() public {
        address bob = makeAddr("bob");
        token.mint(bob, 1000e6);
        usdc.mint(bob, 100e6);

        vm.startPrank(bob);
        token.approve(address(multisend), type(uint256).max);
        // No USDC approval

        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = makeAddr("recipient");
        amounts[0] = 100e6;

        vm.expectRevert();
        multisend.multisendToken(address(token), recipients, amounts);
        vm.stopPrank();
    }

    function test_setMultisendFee_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        multisend.setMultisendFee(10e6);
    }

    function test_setMultisendFee_updatesValue() public {
        multisend.setMultisendFee(10e6);
        assertEq(multisend.multisendFee(), 10e6);
    }

    function test_setTreasury_rejectsZeroAddress() public {
        vm.expectRevert(ForjaMultisend.ZeroAddress.selector);
        multisend.setTreasury(address(0));
    }

    function testFuzz_multisend_variousRecipientCounts(
        uint8 count
    ) public {
        count = uint8(bound(count, 1, 50));
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(count);

        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);

        for (uint256 i; i < count; ++i) {
            assertEq(token.balanceOf(recipients[i]), 100e6);
        }
    }

    function test_multisend_gasEstimate_100recipients() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(100);
        token.mint(alice, 100_000e6);

        vm.prank(alice);
        uint256 gasBefore = gasleft();
        multisend.multisendToken(address(token), recipients, amounts);
        uint256 gasUsed = gasBefore - gasleft();

        assertGt(gasUsed, 0);
    }

    function test_constructor_rejectsZeroUsdc() public {
        vm.expectRevert(ForjaMultisend.ZeroAddress.selector);
        new ForjaMultisend(address(0), treasury, MULTISEND_FEE);
    }

    function test_constructor_rejectsZeroTreasury() public {
        vm.expectRevert(ForjaMultisend.ZeroAddress.selector);
        new ForjaMultisend(address(usdc), address(0), MULTISEND_FEE);
    }

    function test_multisend_exactlyMaxRecipients() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(500);
        token.mint(alice, 50_000_000e6);

        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);

        assertEq(token.balanceOf(recipients[0]), 100e6);
        assertEq(token.balanceOf(recipients[499]), 100e6);
    }

    function test_multisend_duplicateRecipients() public {
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        address bob = makeAddr("bob");
        recipients[0] = bob;
        recipients[1] = bob;
        amounts[0] = 100e6;
        amounts[1] = 200e6;

        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);
        assertEq(token.balanceOf(bob), 300e6);
    }

    function test_multisend_zeroFeeWorks() public {
        multisend.setMultisendFee(0);
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(3);

        vm.prank(alice);
        multisend.multisendToken(address(token), recipients, amounts);

        for (uint256 i; i < 3; ++i) {
            assertEq(token.balanceOf(recipients[i]), 100e6);
        }
    }

    function test_multisend_revertsZeroAddressToken() public {
        (address[] memory recipients, uint256[] memory amounts) = _makeRecipients(2);

        vm.prank(alice);
        vm.expectRevert(ForjaMultisend.ZeroAddress.selector);
        multisend.multisendToken(address(0), recipients, amounts);
    }

    function test_setMultisendFee_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaMultisend.FeeUpdated(MULTISEND_FEE, 10e6);
        multisend.setMultisendFee(10e6);
    }

    function test_setTreasury_emitsEvent() public {
        address newTreasury = makeAddr("newTreasury");
        vm.expectEmit(false, false, false, true);
        emit ForjaMultisend.TreasuryUpdated(treasury, newTreasury);
        multisend.setTreasury(newTreasury);
    }

    function test_setTreasury_updatesValue() public {
        address newTreasury = makeAddr("newTreasury");
        multisend.setTreasury(newTreasury);
        assertEq(multisend.treasury(), newTreasury);
    }
}
