import chai from "chai";
const ethers = require("ethers");
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from "ethereum-waffle";
import TokenMock from "../build/TokenMock";
import LinkdropERC20 from "../build/LinkdropERC20";

chai.use(solidity);
const { expect } = chai;

const ADDRESS_ZERO = ethers.utils.getAddress(
  "0x0000000000000000000000000000000000000000"
);

let provider = createMockProvider();
let [linkdropper, linkdropVerifier] = getWallets(provider);
let tokenInstance;
let linkdropInstance;
const CLAIM_AMOUNT = 10;
const REFERRAL_AMOUNT = 1;
const CLAIM_AMOUNT_ETH = ethers.utils.parseEther("0.001");
const LINKDROP_VERIFICATION_ADDRESS = linkdropVerifier.address;

const signLinkKeyAddress = async function(linkKeyAddress, referralAddress) {
  let messageHash = ethers.utils.solidityKeccak256(
    ["address", "address"],
    [linkKeyAddress, referralAddress]
  );
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await linkdropVerifier.signMessage(messageHashToSign);
  //console.log("Signature: ", signature);
  return signature;
};

const createLink = async function(referralAddress) {
  let linkWallet = ethers.Wallet.createRandom();
  let linkKey = linkWallet.privateKey;
  let linkKeyAddress = linkWallet.address;
  let linkdropVerifierSignature = await signLinkKeyAddress(
    linkKeyAddress,
    referralAddress
  );
  return { linkKey, linkKeyAddress, linkdropVerifierSignature };
};

describe("Linkdrop tests", () => {
  before(async () => {
    tokenInstance = await deployContract(linkdropper, TokenMock, [
      linkdropper.address,
      1000
    ]);

    linkdropInstance = await deployContract(linkdropper, LinkdropERC20, [
      tokenInstance.address,
      CLAIM_AMOUNT,
      REFERRAL_AMOUNT,
      CLAIM_AMOUNT_ETH,
      LINKDROP_VERIFICATION_ADDRESS
    ]);
    console.log("linkdropInstance: ", linkdropInstance.address);
  });

  it("Assigns initial balance of linkdropper", async () => {
    expect(await tokenInstance.balanceOf(linkdropper.address)).to.eq(1000);
  });

  it("Creates new link key and signs it from verifier", async () => {
    let linkOne = await createLink(ADDRESS_ZERO);
    console.log(linkOne);
  });
});
