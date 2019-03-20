const etherlime = require("etherlime");
const LinkdropERC20 = require("../build/LinkdropERC20.json");

const deploy = async (network, secret) => {
  const deployer = new etherlime.EtherlimeGanacheDeployer();
  //const result = await deployer.deploy(AirEscrow);
};

module.exports = {
  deploy
};
