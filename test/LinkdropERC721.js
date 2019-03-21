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

const ONE_ETHER = ethers.utils.parseEther("1");

let provider = createMockProvider();
let [linkdropper, linkdropVerifier, receiver] = getWallets(provider);

const CLAIM_AMOUNT = 10;
const REFERRAL_AMOUNT = 1;
const CLAIM_AMOUNT_ETH = ethers.utils.parseEther("0.01");
const LINKDROP_VERIFICATION_ADDRESS = linkdropVerifier.address;

let tokenInstance;
let linkdropInstance;
let link;
let referralAddress;
let receiverAddress;
let receiverSignature;

const signLinkKeyAddress = async function(linkKeyAddress, referralAddress) {
  let messageHash = ethers.utils.solidityKeccak256(
    ["address", "address"],
    [linkKeyAddress, referralAddress]
  );
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await linkdropVerifier.signMessage(messageHashToSign);
  return signature;
};

const createLink = async function(referralAddress) {
  let wallet = ethers.Wallet.createRandom();
  let key = wallet.privateKey;
  let address = wallet.address;
  let verificationSignature = await signLinkKeyAddress(
    address,
    referralAddress
  );
  return {
    key, //link's ephemeral private key
    address, //address corresponding to link key
    verificationSignature, //signed by linkdrop verifier
    referralAddress //referral address
  };
};

const signReceiverAddress = async function(linkKey, receiverAddress) {
  let wallet = new ethers.Wallet(linkKey);
  let messageHash = ethers.utils.solidityKeccak256(
    ["address"],
    [receiverAddress]
  );
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await wallet.signMessage(messageHashToSign);
  return signature;
};

describe("Linkdrop ERC20 tests", () => {
  before(async () => {
    tokenInstance = await deployContract(linkdropper, TokenMock, [
      linkdropper.address,
      1000
    ]);

    linkdropInstance = await deployContract(
      linkdropper,
      LinkdropERC20,
      [
        tokenInstance.address,
        CLAIM_AMOUNT,
        REFERRAL_AMOUNT,
        CLAIM_AMOUNT_ETH,
        LINKDROP_VERIFICATION_ADDRESS
      ],
      { value: ONE_ETHER }
    );
  });

  it("assigns correct token address", async () => {
    expect(await linkdropInstance.TOKEN_ADDRESS()).to.eq(tokenInstance.address);
  });