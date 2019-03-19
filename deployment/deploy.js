const etherlime = require("etherlime");
const AirEscrow = require("../build/AirEscrow.json");

const deploy = async (network, secret) => {
  const deployer = new etherlime.EtherlimeGanacheDeployer();
  //const result = await deployer.deploy(AirEscrow);
};

module.exports = {
  deploy
};
