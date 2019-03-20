pragma solidity >= 0.5.6;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

/**
 * @title Linkdrop ERC721 
 * 
 */
contract LinkdropERC721 is Pausable {
  
    address public NFT_ADDRESS; // NFT to be ditributed

    address payable public LINKDROPPER; // linkdropper's address, which has NFTs to distribute

    // special address, used on claim to verify that links signed by the LINKDROPPER
    address public LINKDROP_VERIFICATION_ADDRESS; 
  
    event Withdrawn(address indexed linkKeyAddress, uint indexed tokenId, address receiver, uint timestamp);
  
    // Mappings of link key address => receiver address if link is used.                                                                                                                                
    mapping (address => address) claimed;  
  
    /**
    * @dev Contructor that sets linkdrop params 
    * @param _NFTAddress address NFT contract address to distribute
    * @param _linkdropVerificationAddress special address, used on claim to 
    *        verify that links signed by the linkdropper
    */
    constructor
    (
        address _NFTAddress,
        address _linkdropVerificationAddress
    ) 
    public 
    {
        LINKDROPPER = msg.sender;
        NFT_ADDRESS = _NFTAddress;
        LINKDROP_VERIFICATION_ADDRESS = _linkdropVerificationAddress;
    }
  
    /**
    * @dev Verify that address is signed with needed private key.
    * @param _linkKeyAddress address corresponding to link key
    * @param _tokenId tokenId attached to link 
    * @param _signature ECDSA signature
    * @return True if signature is correct.
    */
    function verifyLinkKey
    (
		address _linkKeyAddress,
		uint256 _tokenId,
		bytes memory _signature
    )
    public view 
    returns (bool) 
    {
        bytes32 prefixedHash = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_linkKeyAddress, _tokenId)));
        address signer = ECDSA.recover(prefixedHash, _signature);
        return signer == LINKDROP_VERIFICATION_ADDRESS;
    }
  
    /**
    * @dev Verify that address is signed with needed private key.
    * @param _linkKeyAddress address corresponding to link key
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

    modifier whenValidWithdrawalParams
    (
        address _receiver, 
		uint256 _tokenId, 
		address _linkKeyAddress,
		bytes memory _linkdropperSignature,
		bytes memory _receiverSignature
    )
    {
        // verify that link wasn't claimed before  
        require(isClaimedLink(_linkKeyAddress) == false, "Link has already been claimed");

        // verify that ephemeral key is legit and signed by LINKDROP_VERIFICATION_ADDRESS's key
        require
        (
            verifyLinkKey(_linkKeyAddress, _tokenId, _linkdropperSignature), 
            "Link key is not signed by linkdrop verification key"
        );
    
        // verify that receiver address is signed by ephemeral key assigned to claim link
        require
        (
            verifyReceiverAddress(_linkKeyAddress, _receiver, _receiverSignature), 
            "Receiver address is not signed by link key"
        );

        _;
    }
  
    /**
    * @dev Withdraw nft to receiver address if withdraw params are correct.
    * @param _receiver address to receive tokens.
    * @param _tokenId token id to be sent
    * @param _linkKeyAddress address corresponding to link key 
    * @param _linkdropperSignature ECDSA signature. Signed by the airdrop transit key.
    * @param _receiverSignature ECDSA signature. Signed by the link's ephemeral key.
    * @return True if NFT was successfully sent to receiver.
    */
    function withdraw
    (
		address _receiver, 
		uint256 _tokenId, 
		address _linkKeyAddress,
		bytes memory _linkdropperSignature,
		bytes memory _receiverSignature
	)
    public
    whenNotPaused
    whenValidWithdrawalParams
    (
        _receiver, 
    	_tokenId,
		_linkKeyAddress,
		_linkdropperSignature,
		_receiverSignature
    )
    returns (bool) 
    {
        // mark link as claimed
        claimed[_linkKeyAddress] = _receiver;			
    
        // send nft
        IERC721(NFT_ADDRESS).transferFrom(LINKDROPPER, _receiver, _tokenId);
           
        // log withdrawal
        emit Withdrawn(_linkKeyAddress, _tokenId, _receiver, now);    
        
        return true;
    }

    /**
    * @dev Get boolean if link is already claimed. 
    * @param _linkKeyAddress address corresponding to link key
    * @return True if the transit address was already used. 
    */
    function isClaimedLink(address _linkKeyAddress) 
    public view returns (bool) 
    {
        return linkClaimedTo(_linkKeyAddress) != address(0);
    }

    /**
    * @dev Get receiver for claimed link
    * @param _linkKeyAddress address corresponding to link key
    * @return True if the transit address was already used. 
    */
    function linkClaimedTo(address _linkKeyAddress) 
    public view 
    returns (address) 
    {
        return claimed[_linkKeyAddress];
    }

}