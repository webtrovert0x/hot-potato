import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "Missing DEPLOYER_PRIVATE_KEY in .env. Add your funded BOT Chain Testnet private key first."
    );
  }

  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 968n && network.chainId !== 31337n) {
    throw new Error(
      `Unexpected chain ID ${network.chainId}. Expected BOT Chain Testnet (968).`
    );
  }

  console.log("Deploying BOTHOTPotato with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BOT");

  const Factory = await ethers.getContractFactory("BOTHOTPotato");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("BOTHOTPotato deployed to:", deployedAddress);
  if (network.chainId === 968n) {
    console.log("Explorer URL:", `https://scan.bohr.life/address/${deployedAddress}`);
  }

  // Export ABI to frontend/src/abi/BOTHOTPotato.json if frontend exists
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BOTHOTPotato.sol/BOTHOTPotato.json"
  );
  const frontendAbiDir = path.resolve(__dirname, "../frontend/src/abi");
  if (fs.existsSync(artifactPath) && fs.existsSync(path.resolve(__dirname, "../frontend/src"))) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    fs.mkdirSync(frontendAbiDir, { recursive: true });
    fs.writeFileSync(
      path.join(frontendAbiDir, "BOTHOTPotato.json"),
      JSON.stringify(artifact.abi, null, 2) + "\n"
    );
    console.log("Updated frontend/src/abi/BOTHOTPotato.json");
  }

  console.log("\nNext step: Set CONTRACT_ADDRESS=" + deployedAddress + " in .env");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

