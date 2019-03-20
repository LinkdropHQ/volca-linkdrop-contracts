const etherlime = require("etherlime");
const ethers = require("ethers");
const TokenMock = require("../build/TokenMock.json");
const LinkdropERC20 = require("../build/LinkdropERC20.json");

const linkdropper = accounts[0];
const linkdropVerifier = ethers.Wallet.createRandom();
const deployer = new etherlime.EtherlimeGanacheDeployer(linkdropper.secretKey);

const ADDRESS_ZERO = ethers.utils.getAddress(
  "0x0000000000000000000000000000000000000000"
);
const CLAIM_AMOUNT = 10;
const REFERRAL_AMOUNT = 1;
const CLAIM_AMOUNT_ETH = ethers.utils.parseEther("0");
const LINKDROP_VERIFICATION_ADDRESS = linkdropVerifier.address;

let tokenInstance;
let linkdropInstance;

const signLinkKeyAddress = async (linkKeyAddress, referralAddress) => {
  let messageHash = ethers.utils.solidityKeccak256(
    ["address", "address"],
    [linkKeyAddress, referralAddress]
  );
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await linkdropVerifier.signMessage(messageHashToSign);
  return signature;
};

const createLink = async referralAddress => {
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

const signReceiverAddress = async (linkKey, receiverAddress) => {
  let wallet = new ethers.Wallet(linkKey);
  let messageHash = ethers.utils.solidityKeccak256(
    ["address"],
    [receiverAddress]
  );
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await wallet.signMessage(messageHashToSign);
  return signature;
};

describe("Linkdrop ERC20 Tests", () => {
  before(async () => {
    tokenInstance = await deployer.deploy(
      TokenMock,
      {},
      deployer.signer.address,
      1000
    );

    linkdropInstance = await deployer.deploy(
      LinkdropERC20,
      {},
      tokenInstance.contractAddress,
      CLAIM_AMOUNT,
      REFERRAL_AMOUNT,
      CLAIM_AMOUNT_ETH,
      LINKDROP_VERIFICATION_ADDRESS
    );

    //Sending some eth from linkdropper to Linkdrop Contract
  });

  it("Assigns initial balance of linkdropper", async () => {
    let linkdropperBalance = await tokenInstance.balanceOf(
      linkdropper.signer.address
    );

    assert.equal(linkdropperBalance, 1000);
  });

  it("Creates new link key and verifies its signature", async () => {
    let link = await createLink(ADDRESS_ZERO);

    let success = await linkdropInstance.verifyLinkKey(
      link.address,
      link.referralAddress,
      link.verificationSignature
    );

    assert.equal(success, true);
  });

  it("Signs receiver address with link key and verifies this signature onchain", async () => {
    let link = await createLink(ADDRESS_ZERO);

    let receiverAddress = ethers.Wallet.createRandom().address;

    let receiverSignature = await signReceiverAddress(
      link.key,
      receiverAddress
    );

    let success = await linkdropInstance.verifyReceiverAddress(
      link.address,
      receiverAddress,
      receiverSignature
    );

    assert.equal(success, true);
  });

  it("Should withdraw when passing valid withdrawal params", async () => {
    let referralAddress = ADDRESS_ZERO;
    let link = await createLink(referralAddress);
    let receiverAddress = ethers.Wallet.createRandom().address;
    let receiverSignature = await signReceiverAddress(
      link.key,
      receiverAddress
    );

    let linkdropRelayer = accounts[9];

    //Approving tokens from linkdropper to Linkdrop Contract
    await tokenInstance.approve(linkdropInstance.contractAddress, 200);

    const tx = await linkdropInstance
      .from(linkdropRelayer)
      .withdraw(
        receiverAddress,
        referralAddress,
        link.address,
        link.verificationSignature,
        receiverSignature
      );

    const txReceipt = await linkdropInstance.verboseWaitForTransaction(tx);
    // check for event
    let isEmitted = utils.hasEvent(
      txReceipt,
      linkdropInstance.contract,
      "Withdrawn"
    );
    assert(isEmitted, "Event Withdrawn was not emitted");
  });
});
