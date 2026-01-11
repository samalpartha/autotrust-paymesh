import { expect } from "chai";
import { ethers } from "hardhat";

function idFrom(str: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

describe("MNEEEscrow", function () {
  // ============================================================================
  // BASIC ESCROW TESTS
  // ============================================================================

  it("creates escrow, then arbiter releases to payee", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();

    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-1");
    const amount = ethers.parseUnits("10", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), amount);

    await expect(
      escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, deadline)
    ).to.emit(escrow, "EscrowCreated");

    await expect(
      escrow.connect(arbiter).release(escrowId)
    ).to.emit(escrow, "EscrowReleased");

    expect(await token.balanceOf(payee.address)).to.equal(amount);
    expect(await escrow.escrowCount()).to.equal(1);
  });

  it("payer can refund after deadline", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();

    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-2");
    const amount = ethers.parseUnits("5", 18);
    
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 60;

    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, deadline);

    // before deadline should revert for payer
    await expect(escrow.connect(payer).refund(escrowId)).to.be.revertedWithCustomError(escrow, "DeadlineNotReached");

    // wait past deadline
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    await escrow.connect(payer).refund(escrowId);
    expect(await token.balanceOf(payer.address)).to.equal(ethers.parseUnits("1000", 18));
  });

  // ============================================================================
  // DISPUTE TESTS
  // ============================================================================

  it("payer can raise dispute", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-dispute-1");
    const amount = ethers.parseUnits("10", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, deadline);

    // Payer raises dispute
    await expect(escrow.connect(payer).dispute(escrowId))
      .to.emit(escrow, "EscrowDisputed");

    // Check status is Disputed (4)
    const e = await escrow.escrows(escrowId);
    expect(e.status).to.equal(4); // Disputed
  });

  it("arbiter resolves dispute in favor of payee", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-dispute-2");
    const amount = ethers.parseUnits("10", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, deadline);
    await escrow.connect(payer).dispute(escrowId);

    // Arbiter resolves in favor of payee
    await expect(escrow.connect(arbiter).resolveDispute(escrowId, true))
      .to.emit(escrow, "DisputeResolved")
      .withArgs(escrowId, arbiter.address, true, amount);

    expect(await token.balanceOf(payee.address)).to.equal(amount);
  });

  it("arbiter resolves dispute in favor of payer (refund)", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-dispute-3");
    const amount = ethers.parseUnits("10", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, deadline);
    await escrow.connect(payer).dispute(escrowId);

    // Arbiter resolves in favor of payer (refund)
    await expect(escrow.connect(arbiter).resolveDispute(escrowId, false))
      .to.emit(escrow, "DisputeResolved");

    expect(await token.balanceOf(payer.address)).to.equal(ethers.parseUnits("1000", 18));
  });

  // ============================================================================
  // PARTIAL RELEASE TESTS
  // ============================================================================

  it("arbiter can do partial release (milestone payments)", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-partial-1");
    const amount = ethers.parseUnits("100", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, deadline);

    // Release 30% (milestone 1)
    const milestone1 = ethers.parseUnits("30", 18);
    await expect(escrow.connect(arbiter).releasePartial(escrowId, milestone1))
      .to.emit(escrow, "EscrowReleased");

    expect(await token.balanceOf(payee.address)).to.equal(milestone1);
    expect(await escrow.remainingBalance(escrowId)).to.equal(ethers.parseUnits("70", 18));

    // Release another 50% (milestone 2)
    const milestone2 = ethers.parseUnits("50", 18);
    await escrow.connect(arbiter).releasePartial(escrowId, milestone2);

    expect(await token.balanceOf(payee.address)).to.equal(ethers.parseUnits("80", 18));
    expect(await escrow.remainingBalance(escrowId)).to.equal(ethers.parseUnits("20", 18));

    // Release final 20%
    await escrow.connect(arbiter).releasePartial(escrowId, ethers.parseUnits("20", 18));
    expect(await token.balanceOf(payee.address)).to.equal(amount);
    
    // Check escrow is now Released
    const e = await escrow.escrows(escrowId);
    expect(e.status).to.equal(2); // Released
  });

  // ============================================================================
  // AI AGENT AUTHORIZATION TESTS
  // ============================================================================

  it("owner can authorize AI agent", async () => {
    const [owner, agent, payer, payee] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    // Authorize AI agent
    await expect(escrow.connect(owner).setAgentAuthorization(agent.address, true))
      .to.emit(escrow, "AgentAuthorized")
      .withArgs(agent.address, true);

    expect(await escrow.isAuthorizedAgent(agent.address)).to.equal(true);

    // Agent can now release escrows
    const escrowId = idFrom("order-agent-1");
    const amount = ethers.parseUnits("10", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).createEscrow(escrowId, payee.address, amount, owner.address, deadline);

    // Agent releases (not the arbiter!)
    await escrow.connect(agent).release(escrowId);
    expect(await token.balanceOf(payee.address)).to.equal(amount);
  });

  // ============================================================================
  // VIEW FUNCTION TESTS
  // ============================================================================

  it("tracks total value locked", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const amount1 = ethers.parseUnits("10", 18);
    const amount2 = ethers.parseUnits("20", 18);
    const block = await ethers.provider.getBlock("latest");
    const deadline = block!.timestamp + 3600;

    await token.connect(payer).approve(await escrow.getAddress(), ethers.parseUnits("1000", 18));

    // Create two escrows
    await escrow.connect(payer).createEscrow(idFrom("tvl-1"), payee.address, amount1, arbiter.address, deadline);
    expect(await escrow.totalValueLocked()).to.equal(amount1);

    await escrow.connect(payer).createEscrow(idFrom("tvl-2"), payee.address, amount2, arbiter.address, deadline);
    expect(await escrow.totalValueLocked()).to.equal(amount1 + amount2);

    // Release one
    await escrow.connect(arbiter).release(idFrom("tvl-1"));
    expect(await escrow.totalValueLocked()).to.equal(amount2);
  });
});
