// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MNEEEscrow
/// @notice Minimal, audit-friendly escrow for MNEE (or any ERC-20) with arbiter-controlled settlement.
/// @dev Designed for hackathon demo + reproducible judging. Production would add dispute workflows and richer auth.
contract MNEEEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    enum Status { None, Funded, Released, Refunded }

    struct Escrow {
        address payer;
        address payee;
        address arbiter;
        uint256 amount;
        uint64  deadline; // unix seconds
        Status  status;
    }

    IERC20 public immutable token;

    mapping(bytes32 => Escrow) public escrows;

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        address arbiter,
        uint256 amount,
        uint64 deadline
    );

    event EscrowReleased(bytes32 indexed escrowId, address indexed to, uint256 amount);
    event EscrowRefunded(bytes32 indexed escrowId, address indexed to, uint256 amount);

    error InvalidAddress();
    error InvalidAmount();
    error EscrowExists();
    error EscrowNotFound();
    error NotAuthorized();
    error InvalidState();
    error DeadlineNotReached();

    constructor(address tokenAddress) Ownable(msg.sender) {
        if (tokenAddress == address(0)) revert InvalidAddress();
        token = IERC20(tokenAddress);
    }

    /// @notice Create and fund an escrow.
    /// @param escrowId Unique ID (recommend keccak256 of app-level order id).
    /// @param payee Recipient on successful release.
    /// @param amount Amount of token in smallest units.
    /// @param arbiter Address that can release/refund. (Simple and judge-friendly.)
    /// @param deadline Unix timestamp after which payer can refund if not released.
    function createEscrow(
        bytes32 escrowId,
        address payee,
        uint256 amount,
        address arbiter,
        uint64 deadline
    ) external nonReentrant whenNotPaused {
        if (payee == address(0) || arbiter == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        Escrow storage e = escrows[escrowId];
        if (e.status != Status.None) revert EscrowExists();

        // Pull funds from payer. Requires ERC-20 approve() first.
        token.safeTransferFrom(msg.sender, address(this), amount);

        escrows[escrowId] = Escrow({
            payer: msg.sender,
            payee: payee,
            arbiter: arbiter,
            amount: amount,
            deadline: deadline,
            status: Status.Funded
        });

        emit EscrowCreated(escrowId, msg.sender, payee, arbiter, amount, deadline);
    }

    /// @notice Release escrow to payee. Only arbiter can call.
    function release(bytes32 escrowId) external nonReentrant whenNotPaused {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded) revert InvalidState();
        if (msg.sender != e.arbiter) revert NotAuthorized();

        e.status = Status.Released;
        token.safeTransfer(e.payee, e.amount);

        emit EscrowReleased(escrowId, e.payee, e.amount);
    }

    /// @notice Refund escrow to payer. Arbiter can refund anytime; payer can refund after deadline.
    function refund(bytes32 escrowId) external nonReentrant whenNotPaused {
        Escrow storage e = escrows[escrowId];
        if (e.status == Status.None) revert EscrowNotFound();
        if (e.status != Status.Funded) revert InvalidState();

        bool isArbiter = (msg.sender == e.arbiter);
        bool isPayer = (msg.sender == e.payer);

        if (!isArbiter && !isPayer) revert NotAuthorized();

        if (!isArbiter) {
            // payer path requires deadline reached
            if (block.timestamp < e.deadline) revert DeadlineNotReached();
        }

        e.status = Status.Refunded;
        token.safeTransfer(e.payer, e.amount);

        emit EscrowRefunded(escrowId, e.payer, e.amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
