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
const CLAIM_AMOUNT_ETH = ethers.utils.parseEther("0");
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

    //Sending some eth from linkdropper to linkdrop contract
  });

  it("Assigns initial balance of linkdropper", async () => {
    expect(await tokenInstance.balanceOf(linkdropper.address)).to.eq(1000);
  });

  it("Creates new link key and verifies its signature", async () => {
    let link = await createLink(ADDRESS_ZERO);
    //console.log(link);

    expect(
      await linkdropInstance.verifyLinkKey(
        link.address,
        link.referralAddress,
        link.verificationSignature
      )
    ).to.be.true;
  });

  it("Signs receiver address with link key and verifies this signature onchain", async () => {
    let link = await createLink(ADDRESS_ZERO);
    let receiverAddress = ethers.Wallet.createRandom().address;

    let receiverSignature = await signReceiverAddress(
      link.key,
      receiverAddress
    );

    expect(
      await linkdropInstance.verifyReceiverAddress(
        link.address,
        receiverAddress,
        receiverSignature
      )
    ).to.be.true;
  });

  // it("Should withdraw when passing valid withdrawal params", async () => {
  //   let referralAddress = ADDRESS_ZERO;
  //   let link = await createLink(referralAddress);
  //   let receiverAddress = ethers.Wallet.createRandom().address;
  //   let receiverSignature = await signReceiverAddress(
  //     link.key,
  //     receiverAddress
  //   );

  //   //Approving token from linkdropper to receiver
  //   //await tokenInstance.approve(receiverAddress, 20);

  //   await linkdropInstance.withdraw(
  //     receiverAddress,
  //     referralAddress,
  //     link.address,
  //     link.verificationSignature,
  //     receiverSignature
  //   );
  // });
});
