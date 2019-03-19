pragma solidity >= 0.5.6;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

/**
 * @title Linkdrop ERC20 Contract
 * @dev Contract sends tokens from LINKDROPPER's account to receiver on claim.
 * 
 * When deploying contract, linkdropper provides linkdrop parameters: 
 * [token address, amount of tokens to be linkdropped, amount of eth to be claimed per link, linkdrop verification address]
 * and deposits ether needed for the linkdrop.
 * 
 * Linkdrop verification address is used to verify that links are signed by LINKDROPPER. 
 * 
 * LINKDROPPER generates claim links. Each link contains an ephemeral private key 
 * signed by the private key corresponding to linkdrop verification address. 
 * The ephemeral private key assigned to link can only! be used once to sign receiver's address
 * Receiver claims tokens by providing signature to the Relayer Server, which then calls smart contract to withdraw tokens
 * 
 * On withdrawal smart contract verifies, that receiver provided address signed 
 * by ephemeral private key assigned to the link. 
 * If everything is correct, smart contract sends tokens and ether to receiver.
 * 
 * Anytime LINKDROPPER can get back unclaimed ether using withdrawEther method.
 * 
 */
contract LinkdropERC20 is Pausable {
    
    address public TOKEN_ADDRESS; // ERC20 token to be distributed
    uint public CLAIM_AMOUNT; // amount of tokens claimed per link
    uint public REFERRAL_REWARD; // referral reward

    uint public CLAIM_AMOUNT_ETH; // ether claimed per link
    address payable public LINKDROPPER; // LINKDROPPER address, which holds tokens to distribute
    address public LINKDROP_VERIFICATION_ADDRESS; // special address, used on claim to verify that links signed by the LINKDROPPER

    event Withdrawn(address transitAddress, address receiver, uint timestamp);

    //Indicates whether the link was used or not
    mapping (address => bool) claimed;

    /**
    * @dev Contructor that sets airdrop params and receives ether needed for the 
    * airdrop. 
    * @param _tokenAddress address Token address to distribute
    * @param _claimAmount uint tokens (in atomic values) claimed per link
    * @param _claimAmountEth uint ether (in wei) claimed per link
    * @param _linkdropVerificationAddress special address, used on claim to verify that links signed by LINKDROPPER
    */
    constructor
    (
        address _tokenAddress,
        uint _claimAmount,
        uint  _referralAmount,
        uint _claimAmountEth,
        address _linkdropVerificationAddress
    ) 
    public payable 
    {
        LINKDROPPER = msg.sender;
        TOKEN_ADDRESS = _tokenAddress;
        CLAIM_AMOUNT = _claimAmount;
        REFERRAL_REWARD = _referralAmount;
        CLAIM_AMOUNT_ETH = _claimAmountEth;
        LINKDROP_VERIFICATION_ADDRESS = _linkdropVerificationAddress;
    }

  /**
   * @dev Verify that address corresponding to ephemeral key is signed with this linkdrop's verification key
   * @param _linkKeyAddress address that corresponds to ephemeral link private key generated for claim link
   * @param _signature ECDSA signature
   * @return True if signature is correct.
   */
    function verifyLinkKey
    (
        address _linkKeyAddress, // address that corresponds to ephemeral link private key generated for claim link
        address _referralAddress,
        bytes memory _signature
    )
    public view 
    returns (bool) 
    {
        bytes32 prefixedHash = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_linkKeyAddress, _referralAddress)));
        address signer = ECDSA.recover(prefixedHash, _signature);
        return signer == LINKDROP_VERIFICATION_ADDRESS;
    }


  /**
   * @dev Verify that address to receive tokens is signed with ephemeral private key generated for claim link.
   * @param _linkKeyAddress address that corresponds to ephemeral link private key generated for claim link
   * @param _receiver address to receive token.
   * @param _signature ECDSA signature
   * @return True if signature is correct.
   */
    function verifyReceiverAddress
    (
        address _linkKeyAddress,
        address _receiver,
        bytes memory _signature
    )
    public pure 
    returns (bool) 
    {
        bytes32 prefixedHash = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_receiver)));
        address signer = ECDSA.recover(prefixedHash, _signature);
        return signer == _linkKeyAddress;
    }

    /**
    * @dev Verify that claim params are correct and the link's ephemeral key wasn't used before.  
    * @param _receiver address to receive tokens.
    * @param _linkKeyAddress address that corresponds to ephemeral link private key generated for claim link
    * @param _linkdropperSignature ECDSA signature. Signed by linkdrop verification key.
    * @param _receiverSignature ECDSA signature. Signed by ephemeral key assigned to claim link.
    */
    modifier whenValidWithdrawalParams
    (
        address _receiver,
        address _referralAddress,
        address _linkKeyAddress,
        bytes memory _linkdropperSignature,
        bytes memory _receiverSignature
    )
    {
        // verify that link wasn't claimed before
        require(claimed[_linkKeyAddress] == false, "Link has already been claimed");

        // verify that ephemeral key is legit and signed by LINKDROP_VERIFICATION_ADDRESS's key
        require(verifyLinkKey(_linkKeyAddress, _referralAddress, _linkdropperSignature), "Link key is not signed by linkdrop verification key");

        // verify that receiver address is signed by ephemeral key assigned to claim link
        require(verifyReceiverAddress(_linkKeyAddress, _receiver, _receiverSignature), "Receiver address is not signed by ephemeral claim key");

        // verify that there is enough ether to make transfer
        require(address(this).balance >= CLAIM_AMOUNT_ETH, "Insufficient amount of eth");

        _;
    }

    /**
    * @dev Withdraw tokens to receiver address if withdraw params are correct.
    * @param _receiver address to receive tokens.
    * @param _linkKeyAddress address corresponding to ephemeral link private key provided to receiver by LINKDROPPER
    * @param _linkdropperSignature ECDSA signature. Signed by the airdrop transit key.
    * @param _receiverSignature ECDSA signature. Signed by the link's ephemeral key.
    * @return True if tokens (and ether) were successfully sent to receiver.
    */
    function withdraw
    (
        address payable _receiver,
        address _referralAddress,
        address _linkKeyAddress,
        bytes memory _linkdropperSignature,
        bytes memory _receiverSignature
    )
    public
    whenValidWithdrawalParams
    (   _receiver,
        _referralAddress,
        _linkKeyAddress,
        _linkdropperSignature,
        _receiverSignature
    )
    whenNotPaused
    returns (bool) 
    {
        // save to state that address was used
        claimed[_linkKeyAddress] = true;

        // send tokens
        if (CLAIM_AMOUNT > 0 && TOKEN_ADDRESS != address(0)) {
            //IERC20 token = IERC20(TOKEN_ADDRESS);
            IERC20(TOKEN_ADDRESS).transferFrom(LINKDROPPER, _receiver, CLAIM_AMOUNT);
        }

        // send tokens to the address who refferred the airdrop
        if (REFERRAL_REWARD > 0 && _referralAddress != address(0)) {
            IERC20(TOKEN_ADDRESS).transferFrom(LINKDROPPER, _referralAddress, REFERRAL_REWARD);
        }

        // send ether (if needed)
        if (CLAIM_AMOUNT_ETH > 0) {
            _receiver.transfer(CLAIM_AMOUNT_ETH);
        }

        // Log Withdrawal
        emit Withdrawn(_linkKeyAddress, _receiver, now);

        return true;
    }

    /**
    * @dev Get boolean if link is already claimed. 
    * @param _linkKey address corresponding to ephemeral link private key provided to receiver by the LINKDROPPER
    * @return True if the link key was already used. 
    */
    function isClaimedLink(address _linkKey)
    public view 
    returns (bool) 
    {
        return claimed[_linkKey];
    }

    /**
    * @dev Withdraw back ether deposited to the smart contract.  
    * @return True if ether was withdrawn. 
    */
    function withdrawEther() public returns (bool) {
        require(msg.sender == LINKDROPPER, "Only linkdropper can withdraw ether from this smart contract");
        LINKDROPPER.transfer(address(this).balance);
        return true;
    }

}