import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedRockPaperArena = await deploy("RockPaperArena", {
    from: deployer,
    log: true,
  });

  console.log(`RockPaperArena contract deployed at: `, deployedRockPaperArena.address);
};

export default func;
func.id = "deploy_rockPaperArena"; // id required to prevent reexecution
func.tags = ["RockPaperArena"];
