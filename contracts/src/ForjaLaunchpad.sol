// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ITIP20Factory} from "./interfaces/ITIP20Factory.sol";
import {ITIP20} from "./interfaces/ITIP20.sol";
import {IPoolManager, IPositionManager, PoolKey, PositionConfig} from "./interfaces/IUniswapV4.sol";

/// @title ForjaLaunchpad
/// @notice Bonding curve token launchpad with automatic Uniswap v4 graduation for the Tempo blockchain.
/// @dev Uses virtual reserves constant product curve (x_virtual * y_virtual = k).
///      On reaching the graduation threshold, tokens auto-migrate to Uniswap v4 with permanent liquidity.
contract ForjaLaunchpad is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Constants ───

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e6;
    uint256 public constant CURVE_SUPPLY = 800_000_000e6;
    uint256 public constant LP_RESERVE = 200_000_000e6;
    uint256 public constant VIRTUAL_TOKEN_RESERVE = 1_073_000_000e6;
    uint256 public constant VIRTUAL_USDC_RESERVE = 30_000e6;
    uint256 public constant GRADUATION_THRESHOLD = 69_000e6;
    uint256 public constant TRADING_FEE_BPS = 100;
    uint256 public constant CREATOR_FEE_SHARE_BPS = 5_000;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_TRADE = 1e6;
    uint256 public constant MAX_SINGLE_BUY = 5_000e6;
    uint256 public constant MAX_PER_BLOCK_BPS = 1_000;
    uint256 public constant LAUNCH_TIMEOUT = 30 days;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    int24 public constant UNISWAP_FEE_TIER = 3_000;
    int24 public constant UNISWAP_TICK_SPACING = 60;
    int24 public constant MIN_TICK = -887_220;
    int24 public constant MAX_TICK = 887_220;

    // ─── State ───

    struct Launch {
        address token;
        address creator;
        uint256 virtualTokens;
        uint256 virtualUsdc;
        uint256 realTokensSold;
        uint256 realUsdcRaised;
        uint256 creatorFeeAccrued;
        uint256 startTime;
        bool graduated;
        bool killed;
        bool failed;
    }

    struct LaunchMeta {
        string name;
        string symbol;
        string description;
        string imageUri;
    }

    uint256 public nextLaunchId;
    mapping(uint256 => Launch) public launches;
    mapping(uint256 => LaunchMeta) public launchMeta;
    mapping(uint256 => mapping(uint256 => uint256)) public blockBuys;

    ITIP20Factory public immutable tipFactory;
    IERC20 public immutable usdc;
    address public immutable pathUsd;
    IPoolManager public immutable poolManager;
    IPositionManager public immutable positionManager;

    address public treasury;
    uint256 public createFee;
    bool public allowlistEnabled;
    mapping(address => bool) public allowlisted;

    uint256 public constant MAX_LAUNCHES_PER_DAY = 5;

    // ─── User Deposits (for emergency withdraw) ───

    mapping(uint256 => mapping(address => uint256)) public userDeposits;

    // ─── Daily Launch Count (anti-spam) ───

    mapping(address => mapping(uint256 => uint256)) public dailyLaunchCount;

    // ─── Events ───

    event LaunchCreated(
        uint256 indexed launchId,
        address indexed creator,
        address indexed token,
        string name,
        string symbol,
        string description,
        string imageUri
    );
    event TokenBought(
        uint256 indexed launchId,
        address indexed buyer,
        uint256 usdcSpent,
        uint256 tokensReceived,
        uint256 newPrice
    );
    event TokenSold(
        uint256 indexed launchId,
        address indexed seller,
        uint256 tokensSold,
        uint256 usdcReceived,
        uint256 fee,
        uint256 newPrice
    );
    event Graduated(uint256 indexed launchId, address indexed token, uint256 usdcInPool, uint256 tokensInPool);
    event LaunchKilled(uint256 indexed launchId);
    event LaunchFailed(uint256 indexed launchId);
    event CreatorFeeClaimed(uint256 indexed launchId, address indexed creator, uint256 amount);
    event EmergencyWithdraw(uint256 indexed launchId, address indexed user, uint256 amount);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ─── Errors ───

    error ZeroAddress();
    error LaunchNotActive();
    error LaunchAlreadyGraduated();
    error LaunchKilledError();
    error LaunchNotFailed();
    error BelowMinTrade();
    error AboveMaxBuy();
    error BlockLimitExceeded();
    error SlippageExceeded();
    error InsufficientTokens();
    error NotCreator();
    error NotAllowlisted();
    error LaunchNotTimedOut();
    error NothingToClaim();
    error DailyLimitReached();
    error NothingToWithdraw();
    error NotPaused();

    constructor(
        address _tipFactory,
        address _usdc,
        address _pathUsd,
        address _treasury,
        address _poolManager,
        address _positionManager,
        uint256 _createFee
    ) Ownable(msg.sender) {
        if (
            _tipFactory == address(0) || _usdc == address(0) || _pathUsd == address(0) || _treasury == address(0)
                || _poolManager == address(0) || _positionManager == address(0)
        ) {
            revert ZeroAddress();
        }
        tipFactory = ITIP20Factory(_tipFactory);
        usdc = IERC20(_usdc);
        pathUsd = _pathUsd;
        treasury = _treasury;
        poolManager = IPoolManager(_poolManager);
        positionManager = IPositionManager(_positionManager);
        createFee = _createFee;
    }

    // ─── Core Functions ───

    /// @notice Create a new token launch with a bonding curve.
    function createLaunch(
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata imageUri
    ) external nonReentrant whenNotPaused returns (uint256 launchId) {
        if (allowlistEnabled && !allowlisted[msg.sender]) revert NotAllowlisted();

        {
            uint256 today = block.timestamp / 1 days;
            if (dailyLaunchCount[msg.sender][today] >= MAX_LAUNCHES_PER_DAY) revert DailyLimitReached();
            dailyLaunchCount[msg.sender][today]++;
        }

        if (createFee > 0) usdc.safeTransferFrom(msg.sender, treasury, createFee);

        bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.timestamp, nextLaunchId));
        address token = tipFactory.createToken(name, symbol, "USD", pathUsd, address(this), salt);

        bytes32 issuerRole = ITIP20(token).ISSUER_ROLE();
        ITIP20(token).grantRole(issuerRole, address(this));
        ITIP20(token).mint(address(this), TOTAL_SUPPLY);

        launchId = nextLaunchId++;

        launches[launchId] = Launch({
            token: token,
            creator: msg.sender,
            virtualTokens: VIRTUAL_TOKEN_RESERVE,
            virtualUsdc: VIRTUAL_USDC_RESERVE,
            realTokensSold: 0,
            realUsdcRaised: 0,
            creatorFeeAccrued: 0,
            startTime: block.timestamp,
            graduated: false,
            killed: false,
            failed: false
        });

        launchMeta[launchId] = LaunchMeta({name: name, symbol: symbol, description: description, imageUri: imageUri});

        emit LaunchCreated(launchId, msg.sender, token, name, symbol, description, imageUri);
    }

    /// @notice Buy tokens from a launch's bonding curve.
    function buy(uint256 launchId, uint256 usdcAmount, uint256 minTokensOut) external nonReentrant whenNotPaused {
        Launch storage l = launches[launchId];
        _validateBuy(l, launchId, usdcAmount);

        (uint256 tokensOut, uint256 creatorShare, uint256 treasuryShare, uint256 netUsdc) =
            _calculateBuy(l, usdcAmount);

        if (tokensOut < minTokensOut) revert SlippageExceeded();

        _executeBuy(l, launchId, usdcAmount, tokensOut, creatorShare, treasuryShare, netUsdc);
    }

    /// @notice Sell tokens back to a launch's bonding curve.
    /// @dev Sells are allowed on killed/failed launches so users can exit their positions.
    function sell(uint256 launchId, uint256 tokenAmount, uint256 minUsdcOut) external nonReentrant whenNotPaused {
        Launch storage l = launches[launchId];
        if (l.token == address(0)) revert LaunchNotActive();
        if (l.graduated) revert LaunchAlreadyGraduated();
        if (tokenAmount == 0) revert BelowMinTrade();

        (uint256 netUsdcOut, uint256 creatorShare, uint256 treasuryShare, uint256 newVirtualTokens, uint256 newVirtualUsdc, ) =
            _calculateSell(l, tokenAmount);

        if (netUsdcOut < MIN_TRADE) revert BelowMinTrade();
        if (netUsdcOut < minUsdcOut) revert SlippageExceeded();
        // Pool debit = user payout + treasury fee (creatorShare stays in contract)
        uint256 poolDebit = netUsdcOut + treasuryShare;
        if (poolDebit > l.realUsdcRaised) revert InsufficientTokens();

        // Effects
        l.virtualTokens = newVirtualTokens;
        l.virtualUsdc = newVirtualUsdc;
        l.realTokensSold -= tokenAmount;
        l.realUsdcRaised -= poolDebit;
        l.creatorFeeAccrued += creatorShare;

        uint256 currentDeposit = userDeposits[launchId][msg.sender];
        userDeposits[launchId][msg.sender] = poolDebit >= currentDeposit ? 0 : currentDeposit - poolDebit;

        uint256 newPrice = (l.virtualUsdc * 1e6) / l.virtualTokens;

        uint256 totalFee = creatorShare + treasuryShare;

        // Interactions
        IERC20(l.token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        usdc.safeTransfer(msg.sender, netUsdcOut);
        if (treasuryShare > 0) usdc.safeTransfer(treasury, treasuryShare);

        emit TokenSold(launchId, msg.sender, tokenAmount, netUsdcOut, totalFee, newPrice);
    }

    /// @notice Claim accrued creator trading fees for a launch.
    function claimCreatorFee(uint256 launchId) external nonReentrant {
        Launch storage l = launches[launchId];
        if (l.creator != msg.sender) revert NotCreator();
        uint256 amount = l.creatorFeeAccrued;
        if (amount == 0) revert NothingToClaim();

        l.creatorFeeAccrued = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit CreatorFeeClaimed(launchId, msg.sender, amount);
    }

    // ─── View Functions ───

    function getCurrentPrice(uint256 launchId) external view returns (uint256) {
        Launch storage l = launches[launchId];
        if (l.virtualTokens == 0) return 0;
        return (l.virtualUsdc * 1e6) / l.virtualTokens;
    }

    function calculateBuyReturn(uint256 launchId, uint256 usdcAmount) external view returns (uint256 tokensOut) {
        Launch storage l = launches[launchId];
        uint256 fee = (usdcAmount * TRADING_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        uint256 netUsdc = usdcAmount - fee;
        uint256 k = l.virtualTokens * l.virtualUsdc;
        uint256 newVirtualUsdc = l.virtualUsdc + netUsdc;
        uint256 newVirtualTokens = (k + newVirtualUsdc - 1) / newVirtualUsdc;
        tokensOut = l.virtualTokens - newVirtualTokens;
        uint256 remainingCurve = CURVE_SUPPLY - l.realTokensSold;
        if (tokensOut > remainingCurve) tokensOut = remainingCurve;
    }

    function calculateSellReturn(uint256 launchId, uint256 tokenAmount) external view returns (uint256 usdcOut) {
        Launch storage l = launches[launchId];
        uint256 k = l.virtualTokens * l.virtualUsdc;
        uint256 newVirtualTokens = l.virtualTokens + tokenAmount;
        uint256 newVirtualUsdc = k / newVirtualTokens;
        uint256 grossUsdcOut = l.virtualUsdc - newVirtualUsdc;
        uint256 fee = (grossUsdcOut * TRADING_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        usdcOut = grossUsdcOut - fee;
    }

    function getLaunchInfo(uint256 launchId) external view returns (Launch memory) {
        return launches[launchId];
    }

    function getLaunchMeta(uint256 launchId) external view returns (LaunchMeta memory) {
        return launchMeta[launchId];
    }

    // ─── Admin Functions ───

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function killLaunch(uint256 launchId) external onlyOwner {
        Launch storage l = launches[launchId];
        if (l.token == address(0)) revert LaunchNotActive();
        if (l.graduated) revert LaunchAlreadyGraduated();
        l.killed = true;
        emit LaunchKilled(launchId);
    }

    function setCreateFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = createFee;
        createFee = _fee;
        emit FeeUpdated(oldFee, _fee);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    function setAllowlistEnabled(bool enabled) external onlyOwner {
        allowlistEnabled = enabled;
    }

    function setAllowlisted(address addr, bool status) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        allowlisted[addr] = status;
    }

    // ─── Safety Functions ───

    function markLaunchAsFailed(uint256 launchId) external {
        Launch storage l = launches[launchId];
        if (l.token == address(0)) revert LaunchNotActive();
        if (l.graduated || l.failed) revert LaunchAlreadyGraduated();
        if (block.timestamp < l.startTime + LAUNCH_TIMEOUT) revert LaunchNotTimedOut();
        l.failed = true;
        emit LaunchFailed(launchId);
    }

    /// @notice Emergency withdraw: when contract is paused, users can reclaim their deposits.
    /// @dev Returns the lesser of userDeposit and available USDC balance. Resets deposit to 0.
    function emergencyWithdraw(uint256 launchId) external nonReentrant {
        if (!paused()) revert NotPaused();
        Launch storage l = launches[launchId];
        if (l.graduated) revert LaunchAlreadyGraduated();

        uint256 deposit = userDeposits[launchId][msg.sender];
        if (deposit == 0) revert NothingToWithdraw();

        userDeposits[launchId][msg.sender] = 0;

        uint256 available = usdc.balanceOf(address(this));
        uint256 refund = deposit > available ? available : deposit;

        usdc.safeTransfer(msg.sender, refund);
        emit EmergencyWithdraw(launchId, msg.sender, refund);
    }

    // ─── Internal ───

    function _validateBuy(Launch storage l, uint256 launchId, uint256 usdcAmount) internal view {
        if (l.token == address(0)) revert LaunchNotActive();
        if (l.graduated) revert LaunchAlreadyGraduated();
        if (l.killed || l.failed) revert LaunchKilledError();
        if (usdcAmount < MIN_TRADE) revert BelowMinTrade();
        if (usdcAmount > MAX_SINGLE_BUY) revert AboveMaxBuy();
        uint256 maxPerBlock = (GRADUATION_THRESHOLD * MAX_PER_BLOCK_BPS) / BPS_DENOMINATOR;
        if (blockBuys[launchId][block.number] + usdcAmount > maxPerBlock) revert BlockLimitExceeded();
    }

    function _calculateBuy(
        Launch storage l,
        uint256 usdcAmount
    ) internal view returns (uint256 tokensOut, uint256 creatorShare, uint256 treasuryShare, uint256 netUsdc) {
        uint256 fee = (usdcAmount * TRADING_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        netUsdc = usdcAmount - fee;

        uint256 k = l.virtualTokens * l.virtualUsdc;
        uint256 newVirtualUsdc = l.virtualUsdc + netUsdc;
        uint256 newVirtualTokens = (k + newVirtualUsdc - 1) / newVirtualUsdc;
        tokensOut = l.virtualTokens - newVirtualTokens;

        uint256 remainingCurve = CURVE_SUPPLY - l.realTokensSold;
        if (tokensOut > remainingCurve) tokensOut = remainingCurve;

        creatorShare = (fee * CREATOR_FEE_SHARE_BPS) / BPS_DENOMINATOR;
        treasuryShare = fee - creatorShare;
    }

    function _executeBuy(
        Launch storage l,
        uint256 launchId,
        uint256 usdcAmount,
        uint256 tokensOut,
        uint256 creatorShare,
        uint256 treasuryShare,
        uint256 netUsdc
    ) internal {
        // Recalculate new virtual reserves
        uint256 k = l.virtualTokens * l.virtualUsdc;
        uint256 newVirtualUsdc = l.virtualUsdc + netUsdc;
        uint256 newVirtualTokens = (k + newVirtualUsdc - 1) / newVirtualUsdc;

        // Effects
        l.virtualTokens = newVirtualTokens;
        l.virtualUsdc = newVirtualUsdc;
        l.realTokensSold += tokensOut;
        l.realUsdcRaised += netUsdc;
        l.creatorFeeAccrued += creatorShare;
        blockBuys[launchId][block.number] += usdcAmount;
        userDeposits[launchId][msg.sender] += netUsdc;

        uint256 newPrice = (newVirtualUsdc * 1e6) / newVirtualTokens;

        // Interactions
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        if (treasuryShare > 0) usdc.safeTransfer(treasury, treasuryShare);
        IERC20(l.token).safeTransfer(msg.sender, tokensOut);

        emit TokenBought(launchId, msg.sender, usdcAmount, tokensOut, newPrice);

        if (l.realUsdcRaised >= GRADUATION_THRESHOLD) {
            _graduate(launchId);
        }
    }

    function _calculateSell(
        Launch storage l,
        uint256 tokenAmount
    )
        internal
        view
        returns (
            uint256 netUsdcOut,
            uint256 creatorShare,
            uint256 treasuryShare,
            uint256 newVirtualTokens,
            uint256 newVirtualUsdc,
            uint256 grossUsdcOut
        )
    {
        uint256 k = l.virtualTokens * l.virtualUsdc;
        newVirtualTokens = l.virtualTokens + tokenAmount;
        newVirtualUsdc = k / newVirtualTokens;
        grossUsdcOut = l.virtualUsdc - newVirtualUsdc;

        uint256 fee = (grossUsdcOut * TRADING_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        netUsdcOut = grossUsdcOut - fee;

        creatorShare = (fee * CREATOR_FEE_SHARE_BPS) / BPS_DENOMINATOR;
        treasuryShare = fee - creatorShare;
    }

    function _graduate(uint256 launchId) internal {
        Launch storage l = launches[launchId];
        l.graduated = true;

        address token = l.token;
        uint256 usdcForPool = l.realUsdcRaised;
        uint256 tokensForPool = LP_RESERVE;

        (address currency0, address currency1, uint256 amount0, uint256 amount1) =
            _orderCurrencies(token, tokensForPool, usdcForPool);

        uint160 sqrtPriceX96 = _calculateSqrtPriceX96(amount0, amount1);

        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: uint24(UNISWAP_FEE_TIER),
            tickSpacing: UNISWAP_TICK_SPACING,
            hooks: address(0)
        });

        try poolManager.initialize(poolKey, sqrtPriceX96) {}
        catch {
            l.graduated = false;
            l.failed = true;
            emit LaunchFailed(launchId);
            return;
        }

        IERC20(token).approve(address(positionManager), tokensForPool);
        usdc.approve(address(positionManager), usdcForPool);

        PositionConfig memory config =
            PositionConfig({poolKey: poolKey, tickLower: MIN_TICK, tickUpper: MAX_TICK});

        try positionManager.mint(
            config, type(uint128).max, uint128(amount0), uint128(amount1), BURN_ADDRESS, block.timestamp + 60, ""
        ) {} catch {
            l.graduated = false;
            l.failed = true;
            emit LaunchFailed(launchId);
            return;
        }

        uint256 unsoldTokens = CURVE_SUPPLY - l.realTokensSold;
        if (unsoldTokens > 0) {
            IERC20(token).safeTransfer(BURN_ADDRESS, unsoldTokens);
        }

        _renounceTokenRoles(token);

        emit Graduated(launchId, token, usdcForPool, tokensForPool);
    }

    function _orderCurrencies(
        address token,
        uint256 tokensForPool,
        uint256 usdcForPool
    ) internal view returns (address currency0, address currency1, uint256 amount0, uint256 amount1) {
        if (token < pathUsd) {
            currency0 = token;
            currency1 = pathUsd;
            amount0 = tokensForPool;
            amount1 = usdcForPool;
        } else {
            currency0 = pathUsd;
            currency1 = token;
            amount0 = usdcForPool;
            amount1 = tokensForPool;
        }
    }

    function _renounceTokenRoles(address token) internal {
        bytes32 issuerRole = ITIP20(token).ISSUER_ROLE();
        if (ITIP20(token).hasRole(address(this), issuerRole)) {
            ITIP20(token).renounceRole(issuerRole);
        }
        if (ITIP20(token).hasRole(address(this), bytes32(0))) {
            ITIP20(token).renounceRole(bytes32(0));
        }
    }

    function _calculateSqrtPriceX96(uint256 amount0, uint256 amount1) internal pure returns (uint160) {
        uint256 ratioX96 = (amount1 << 96) / amount0;
        return uint160(_sqrt(ratioX96 << 96));
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
