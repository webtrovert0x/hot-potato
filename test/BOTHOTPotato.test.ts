import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { BOTHOTPotato } from "../typechain-types";

describe("BOTHOTPotato", function () {
  async function deployFixture() {
    const [owner, player1, player2, player3, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BOTHOTPotato");
    const contract = (await Factory.deploy()) as BOTHOTPotato;
    await contract.waitForDeployment();
    return { contract, owner, player1, player2, player3, outsider };
  }

  describe("Deployment & Initial State", function () {
    it("sets the deployer as owner with inactive round state", async function () {
      const { contract, owner } = await deployFixture();
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.roundId()).to.equal(0n);
      expect(await contract.roundActive()).to.equal(false);
      expect(await contract.getCurrentHolder()).to.equal(ethers.ZeroAddress);

      const info = await contract.getRoundInfo();
      expect(info.roundId).to.equal(0n);
      expect(info.currentHolder).to.equal(ethers.ZeroAddress);
      expect(info.roundActive).to.equal(false);
      expect(info.lastLosingHolder).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Starting a Round", function () {
    it("allows owner to start a round with valid initial holder and duration", async function () {
      const { contract, player1 } = await deployFixture();
      const duration = 120n;

      const tx = await contract.startRound(player1.address, duration);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expectedStart = BigInt(block!.timestamp);
      const expectedDeadline = expectedStart + duration;

      await expect(tx)
        .to.emit(contract, "RoundStarted")
        .withArgs(1n, player1.address, expectedStart, expectedDeadline, duration);

      expect(await contract.roundId()).to.equal(1n);
      expect(await contract.getCurrentHolder()).to.equal(player1.address);
      expect(await contract.roundActive()).to.equal(true);
      expect(await contract.roundStartTimestamp()).to.equal(expectedStart);
      expect(await contract.roundDeadline()).to.equal(expectedDeadline);
      expect(await contract.roundDuration()).to.equal(duration);

      const info = await contract.getRoundInfo();
      expect(info.roundId).to.equal(1n);
      expect(info.currentHolder).to.equal(player1.address);
      expect(info.roundStartTimestamp).to.equal(expectedStart);
      expect(info.roundDeadline).to.equal(expectedDeadline);
      expect(info.roundDuration).to.equal(duration);
      expect(info.roundActive).to.equal(true);
    });

    it("rejects unauthorized round creation from non-owner", async function () {
      const { contract, player1, outsider } = await deployFixture();
      await expect(
        contract.connect(outsider).startRound(player1.address, 120)
      ).to.be.revertedWithCustomError(contract, "NotOwner");
    });

    it("rejects zero-address initial holder", async function () {
      const { contract } = await deployFixture();
      await expect(
        contract.startRound(ethers.ZeroAddress, 120)
      ).to.be.revertedWithCustomError(contract, "InvalidInitialHolder");
    });

    it("rejects durations below 60 seconds or above 3600 seconds", async function () {
      const { contract, player1 } = await deployFixture();
      await expect(contract.startRound(player1.address, 59))
        .to.be.revertedWithCustomError(contract, "InvalidDuration")
        .withArgs(59);

      await expect(contract.startRound(player1.address, 3601))
        .to.be.revertedWithCustomError(contract, "InvalidDuration")
        .withArgs(3601);
    });

    it("prevents starting a second round while an existing round is active", async function () {
      const { contract, player1, player2 } = await deployFixture();
      await contract.startRound(player1.address, 120);

      await expect(
        contract.startRound(player2.address, 120)
      ).to.be.revertedWithCustomError(contract, "RoundAlreadyActive");
    });
  });

  describe("Passing the Potato", function () {
    it("allows the current holder to pass the potato before expiry", async function () {
      const { contract, player1, player2, player3 } = await deployFixture();
      await contract.startRound(player1.address, 120);

      const tx1 = await contract.connect(player1).passPotato(player2.address);
      const receipt1 = await tx1.wait();
      const block1 = await ethers.provider.getBlock(receipt1!.blockNumber);

      await expect(tx1)
        .to.emit(contract, "PotatoPassed")
        .withArgs(1n, player1.address, player2.address, BigInt(block1!.timestamp));

      expect(await contract.getCurrentHolder()).to.equal(player2.address);

      const tx2 = await contract.connect(player2).passPotato(player3.address);
      const receipt2 = await tx2.wait();
      const block2 = await ethers.provider.getBlock(receipt2!.blockNumber);

      await expect(tx2)
        .to.emit(contract, "PotatoPassed")
        .withArgs(1n, player2.address, player3.address, BigInt(block2!.timestamp));

      expect(await contract.getCurrentHolder()).to.equal(player3.address);
    });

    it("rejects passing when no round is active", async function () {
      const { contract, player1, player2 } = await deployFixture();
      await expect(
        contract.connect(player1).passPotato(player2.address)
      ).to.be.revertedWithCustomError(contract, "RoundNotActive");
    });

    it("rejects passes from non-holders", async function () {
      const { contract, player1, player2, outsider } = await deployFixture();
      await contract.startRound(player1.address, 120);

      await expect(
        contract.connect(outsider).passPotato(player2.address)
      ).to.be.revertedWithCustomError(contract, "NotCurrentHolder");
    });

    it("rejects self-passes", async function () {
      const { contract, player1 } = await deployFixture();
      await contract.startRound(player1.address, 120);

      await expect(
        contract.connect(player1).passPotato(player1.address)
      ).to.be.revertedWithCustomError(contract, "CannotPassToSelf");
    });

    it("rejects zero-address recipients", async function () {
      const { contract, player1 } = await deployFixture();
      await contract.startRound(player1.address, 120);

      await expect(
        contract.connect(player1).passPotato(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "InvalidRecipient");
    });

    it("rejects passes at or after round expiry", async function () {
      const { contract, player1, player2 } = await deployFixture();
      await contract.startRound(player1.address, 60);
      const deadline = await contract.roundDeadline();

      await time.increaseTo(deadline);

      await expect(
        contract.connect(player1).passPotato(player2.address)
      ).to.be.revertedWithCustomError(contract, "RoundExpired");
    });
  });

  describe("Ending a Round", function () {
    it("rejects premature round ending before deadline", async function () {
      const { contract, player1, outsider } = await deployFixture();
      await contract.startRound(player1.address, 120);

      await expect(
        contract.connect(outsider).endRound()
      ).to.be.revertedWithCustomError(contract, "RoundNotExpired");
    });

    it("allows anyone to end an expired round and records the losing holder", async function () {
      const { contract, player1, player2, outsider } = await deployFixture();
      await contract.startRound(player1.address, 90);
      await contract.connect(player1).passPotato(player2.address);

      const deadline = await contract.roundDeadline();
      await time.increaseTo(deadline);

      const tx = await contract.connect(outsider).endRound();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(contract, "RoundEnded")
        .withArgs(1n, player2.address, BigInt(block!.timestamp));

      expect(await contract.roundActive()).to.equal(false);
      expect(await contract.lastLosingHolder()).to.equal(player2.address);

      // Allows starting a subsequent round once ended
      await contract.startRound(player1.address, 60);
      expect(await contract.roundId()).to.equal(2n);
      expect(await contract.roundActive()).to.equal(true);
    });

    it("rejects ending a round when no round is active", async function () {
      const { contract } = await deployFixture();
      await expect(contract.endRound()).to.be.revertedWithCustomError(
        contract,
        "RoundNotActive"
      );
    });
  });
});

