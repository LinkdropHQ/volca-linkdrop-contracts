pragma solidity ^0.5.1;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract NFTMock is ERC721 {
    
    //mints given amount of NFTs to initialAccount
    constructor(address initialAccount, uint amount) public {
        for (uint i = 0; i < amount; i++) {
            super._mint(initialAccount, i);
        }
    }
    
}