import { expect } from "chai";
import { ethers } from "hardhat";

function idFrom(str: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

describe("MNEEEscrow", function () {
  it("creates escrow, then arbiter releases to payee", async () => {
    const [payer, payee, arbiter] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MOCK");
    await token.waitForDeployment();

    // mint to payer
    await token.mint(payer.address, ethers.parseUnits("1000", 18));

    const Escrow = await ethers.getContractFactory("MNEEEscrow");
    const escrow = await Escrow.deploy(await token.getAddress());
    await escrow.waitForDeployment();

    const escrowId = idFrom("order-1");
    const amount = ethers.parseUnits("10", 18);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    await token.connect(payer).approve(await escrow.getAddress(), amount);

    await expect(
      escrow.connect(payer).createEscrow(escrowId, payee.address, amount, arbiter.address, Number(deadline))
    ).to.emit(escrow, "EscrowCreated");

    await expect(
      escrow.connect(arbiter).release(escrowId)
    ).to.emit(escrow, "EscrowReleased");

    expect(await token.balanceOf(payee.address)).to.equal(amount);
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
    
    // Get current block timestamp and set deadline 60 seconds in future
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
});
