const etherlime = require("etherlime");
const ethers = require("ethers");
const LinkdropERC20 = require("../build/LinkdropERC20.json");
const TokenMock = require("../build/TokenMock.json");

const linkdropper = new etherlime.EtherlimeGanacheDeployer();
const linkdropVerifier = ethers.Wallet.createRandom();

const CLAIM_AMOUNT = 10;
const REFERRAL_AMOUNT = 1;
const CLAIM_AMOUNT_ETH = ethers.utils.parseEther("0");
const LINKDROP_VERIFICATION_ADDRESS = linkdropVerifier.address;

const deploy = async (network, secret) => {
  const tokenInstance = await linkdropper.deploy(
    TokenMock,
    {},
    linkdropper.signer.address,
    1000
  );

  const linkdropInstance = await linkdropper.deploy(
    LinkdropERC20,
    {},
    tokenInstance.contractAddress,
    CLAIM_AMOUNT,
    REFERRAL_AMOUNT,
    CLAIM_AMOUNT_ETH,
    LINKDROP_VERIFICATION_ADDRESS
  );
};

module.exports = {
  deploy
};
