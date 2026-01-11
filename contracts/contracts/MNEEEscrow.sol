// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MNEEEscrow
/// @author AutoTrust Paymesh Team
/// @notice Production-ready escrow for MNEE stablecoin with AI agent integration support.
/// @dev Implements ERC-20 SafeERC20, ReentrancyGuard, Pausable per OpenZeppelin best practices.
/// @custom:security-contact security@autotrust.io
contract MNEEEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    /// @notice MNEE token address on Ethereum Mainnet
    /// @dev From https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
    address public constant MNEE_MAINNET = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    
    /// @notice Minimum escrow amount (1 MNEE = 1e18 wei)
    uint256 public constant MIN_AMOUNT = 1e16; // 0.01 MNEE
    
    /// @notice Maximum deadline extension (30 days)
    uint64 public constant MAX_EXTENSION = 30 days;
    
    /// @notice Dispute resolution timeout (7 days)
    uint64 public constant DISPUTE_TIMEOUT = 7 days;

    // ============================================================================
    // STATE
    // ============================================================================

    enum Status { None, Funded, Released, Refunded, Disputed }

    struct Escrow {
        address payer;
        address payee;
        address arbiter;
        uint256 amount;
        uint256 released;      // Amount already released (for partial releases)
        uint64  deadline;      // Unix timestamp
        uint64  disputedAt;    // When dispute was raised (0 = no dispute)
        Status  status;
        bytes32 metadataHash;  // IPFS hash or keccak256 of off-chain metadata
    }

    /// @notice The ERC-20 token used for escrows
    IERC20 public immutable token;
    
    /// @notice Total number of escrows created
    uint256 public escrowCount;
    
    /// @notice Total value locked in active escrows
    uint256 public totalValueLocked;

    /// @notice Escrow data by ID
    mapping(bytes32 => Escrow) public escrows;
    
    /// @notice Authorized AI agent addresses that can trigger autonomous actions
    mapping(address => bool) public authorizedAgents;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        address arbiter,
        uint256 amount,
        uint64 deadline,
        bytes32 metadataHash
    );

    event EscrowReleased(
        bytes32 indexed escrowId, 
        address indexed to, 
        uint256 amount,
        uint256 remaining
    );
    
    event EscrowRefunded(
        bytes32 indexed escrowId, 
        address indexed to, 
        uint256 amount
    );
    
    event EscrowDisputed(
        bytes32 indexed escrowId,
        address indexed disputedBy,
        uint64 disputedAt
    );
    
    event DisputeResolved(
        bytes32 indexed escrowId,
        address indexed resolvedBy,
        bool releasedToPayee,
        uint256 amount
    );
    
    event DeadlineExtended(
        bytes32 indexed escrowId,
        uint64 oldDeadline,
        uint64 newDeadline
    );
    
    event AgentAuthorized(address indexed agent, bool authorized);

    // ============================================================================
    // ERRORS
    // ============================================================================

    error InvalidAddress();
    error InvalidAmount();
    error EscrowExists();
    error EscrowNotFound();
    error NotAuthorized();
    error InvalidState();
    error DeadlineNotReached();
    error DeadlinePassed();
    error ExtensionTooLong();
    error AlreadyDisputed();
    error DisputeNotActive();
    error PartialReleaseExceedsBalance();

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    /// @notice Deploy the escrow contract
    /// @param tokenAddress ERC-20 token to use (MNEE on mainnet)
    constructor(address tokenAddress) Ownable(msg.sender) {
        if (tokenAddress == address(0)) revert InvalidAddress();
        token = IERC20(tokenAddress);
    }

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyArbiterOrAgent(bytes32 escrowId) {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.arbiter && !authorizedAgents[msg.sender]) {
            revert NotAuthorized();
        }
        _;
    }

    // ============================================================================
    // ESCROW LIFECYCLE
    // ============================================================================

    /// @notice Create and fund an escrow
    /// @param escrowId Unique identifier (recommend keccak256 of order ID)
    /// @param payee Recipient address on successful release
    /// @param amount Amount in token's smallest units (18 decimals for MNEE)
    /// @param arbiter Address authorized to release/refund
    /// @param deadline Unix timestamp after which payer can refund
    /// @param metadataHash Optional IPFS hash or metadata reference
    function createEscrow(
        bytes32 escrowId,
        address payee,
        uint256 amount,
        address arbiter,
        uint64 deadline,
        bytes32 metadataHash
    ) external nonReentrant whenNotPaused {
        if (payee == address(0) || arbiter == address(0)) revert InvalidAddress();
        if (amount < MIN_AMOUNT) revert InvalidAmount();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        Escrow storage e = escrows[escrowId];
        if (e.status != Status.None) revert EscrowExists();

        // Pull funds from payer (requires prior ERC-20 approve)
        token.safeTransferFrom(msg.sender, address(this), amount);

        escrows[escrowId] = Escrow({
            payer: msg.sender,
            payee: payee,
            arbiter: arbiter,
            amount: amount,
            released: 0,
            deadline: deadline,
            disputedAt: 0,
            status: Status.Funded,
            metadataHash: metadataHash
        });

        escrowCount++;
        totalValueLocked += amount;

        emit EscrowCreated(escrowId, msg.sender, payee, arbiter, amount, deadline, metadataHash);
    }

    /// @notice Create escrow with default empty metadata (backwards compatible)
    function createEscrow(
        bytes32 escrowId,
        address payee,
        uint256 amount,
        address arbiter,
        uint64 deadline
    ) external nonReentrant whenNotPaused {
        if (payee == address(0) || arbiter == address(0)) revert InvalidAddress();
        if (amount < MIN_AMOUNT) revert InvalidAmount();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        Escrow storage e = escrows[escrowId];
        if (e.status != Status.None) revert EscrowExists();

        token.safeTransferFrom(msg.sender, address(this), amount);

        escrows[escrowId] = Escrow({
            payer: msg.sender,
            payee: payee,
            arbiter: arbiter,
            amount: amount,
            released: 0,
            deadline: deadline,
            disputedAt: 0,
            status: Status.Funded,
            metadataHash: bytes32(0)
        });

        escrowCount++;
        totalValueLocked += amount;

        emit EscrowCreated(escrowId, msg.sender, payee, arbiter, amount, deadline, bytes32(0));
    }

    /// @notice Release full escrow amount to payee
    /// @dev Only arbiter or authorized AI agent can call
    function release(bytes32 escrowId) external nonReentrant whenNotPaused onlyArbiterOrAgent(escrowId) {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded && e.status != Status.Disputed) revert InvalidState();

        uint256 remaining = e.amount - e.released;
        e.status = Status.Released;
        e.released = e.amount;
        totalValueLocked -= remaining;
        
        token.safeTransfer(e.payee, remaining);

        emit EscrowReleased(escrowId, e.payee, remaining, 0);
    }

    /// @notice Release partial amount to payee (for milestone-based payments)
    /// @param escrowId The escrow identifier
    /// @param partialAmount Amount to release
    function releasePartial(bytes32 escrowId, uint256 partialAmount) external nonReentrant whenNotPaused onlyArbiterOrAgent(escrowId) {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded && e.status != Status.Disputed) revert InvalidState();
        
        uint256 remaining = e.amount - e.released;
        if (partialAmount > remaining) revert PartialReleaseExceedsBalance();

        e.released += partialAmount;
        totalValueLocked -= partialAmount;
        
        // If fully released, mark as complete
        if (e.released >= e.amount) {
            e.status = Status.Released;
        }

        token.safeTransfer(e.payee, partialAmount);

        emit EscrowReleased(escrowId, e.payee, partialAmount, e.amount - e.released);
    }

    /// @notice Refund escrow to payer
    /// @dev Arbiter/agent can refund anytime; payer can refund after deadline
    function refund(bytes32 escrowId) external nonReentrant whenNotPaused {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded && e.status != Status.Disputed) revert InvalidState();

        bool isArbiterOrAgent = (msg.sender == e.arbiter || authorizedAgents[msg.sender]);
        bool isPayer = (msg.sender == e.payer);

        if (!isArbiterOrAgent && !isPayer) revert NotAuthorized();

        // Payer can only refund after deadline
        if (!isArbiterOrAgent && block.timestamp < e.deadline) {
            revert DeadlineNotReached();
        }

        uint256 remaining = e.amount - e.released;
        e.status = Status.Refunded;
        totalValueLocked -= remaining;
        
        token.safeTransfer(e.payer, remaining);

        emit EscrowRefunded(escrowId, e.payer, remaining);
    }

    // ============================================================================
    // DISPUTE MANAGEMENT
    // ============================================================================

    /// @notice Raise a dispute on an escrow
    /// @dev Either payer or payee can dispute before deadline
    function dispute(bytes32 escrowId) external whenNotPaused {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded) revert InvalidState();
        if (msg.sender != e.payer && msg.sender != e.payee) revert NotAuthorized();
        if (e.disputedAt != 0) revert AlreadyDisputed();

        e.disputedAt = uint64(block.timestamp);
        e.status = Status.Disputed;

        emit EscrowDisputed(escrowId, msg.sender, e.disputedAt);
    }

    /// @notice Resolve a dispute (arbiter/agent only)
    /// @param escrowId The escrow identifier
    /// @param releaseToPayee True to release to payee, false to refund to payer
    function resolveDispute(bytes32 escrowId, bool releaseToPayee) external nonReentrant whenNotPaused onlyArbiterOrAgent(escrowId) {
        Escrow storage e = escrows[escrowId];
        if (e.status != Status.Disputed) revert DisputeNotActive();

        uint256 remaining = e.amount - e.released;
        totalValueLocked -= remaining;

        if (releaseToPayee) {
            e.status = Status.Released;
            e.released = e.amount;
            token.safeTransfer(e.payee, remaining);
        } else {
            e.status = Status.Refunded;
            token.safeTransfer(e.payer, remaining);
        }

        emit DisputeResolved(escrowId, msg.sender, releaseToPayee, remaining);
    }

    // ============================================================================
    // DEADLINE MANAGEMENT
    // ============================================================================

    /// @notice Extend escrow deadline (requires both payer and payee agreement via arbiter)
    /// @param escrowId The escrow identifier
    /// @param extension Additional seconds to add to deadline
    function extendDeadline(bytes32 escrowId, uint64 extension) external whenNotPaused onlyArbiterOrAgent(escrowId) {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded && e.status != Status.Disputed) revert InvalidState();
        if (extension > MAX_EXTENSION) revert ExtensionTooLong();

        uint64 oldDeadline = e.deadline;
        e.deadline = oldDeadline + extension;

        emit DeadlineExtended(escrowId, oldDeadline, e.deadline);
    }

    // ============================================================================
    // AI AGENT MANAGEMENT
    // ============================================================================

    /// @notice Authorize or revoke an AI agent address
    /// @param agent Address of the AI agent
    /// @param authorized Whether to authorize or revoke
    function setAgentAuthorization(address agent, bool authorized) external onlyOwner {
        if (agent == address(0)) revert InvalidAddress();
        authorizedAgents[agent] = authorized;
        emit AgentAuthorized(agent, authorized);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /// @notice Get escrow details
    function getEscrow(bytes32 escrowId) external view returns (
        address payer,
        address payee,
        address arbiter,
        uint256 amount,
        uint256 released,
        uint64 deadline,
        uint64 disputedAt,
        Status status,
        bytes32 metadataHash
    ) {
        Escrow storage e = escrows[escrowId];
        return (e.payer, e.payee, e.arbiter, e.amount, e.released, e.deadline, e.disputedAt, e.status, e.metadataHash);
    }

    /// @notice Check if escrow is past deadline
    function isExpired(bytes32 escrowId) external view returns (bool) {
        return block.timestamp >= escrows[escrowId].deadline;
    }

    /// @notice Get remaining balance in escrow
    function remainingBalance(bytes32 escrowId) external view returns (uint256) {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.Funded || e.status == Status.Disputed) {
            return e.amount - e.released;
        }
        return 0;
    }

    /// @notice Check if address is authorized agent
    function isAuthorizedAgent(address agent) external view returns (bool) {
        return authorizedAgents[agent];
    }

    // ============================================================================
    // ADMIN
    // ============================================================================

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
