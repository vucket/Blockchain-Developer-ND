pragma solidity >=0.4.21 <0.6.0;

// TODO define a contract call to the zokrates generated solidity contract <Verifier> or <renamedVerifier>

import "./ERC721Mintable.sol";
import "./verifier.sol";

// TODO define another contract named SolnSquareVerifier that inherits from your ERC721Mintable class
contract SolnSquareVerifier is MorsaHomeERC721Mintable, Verifier {
    // TODO define a solutions struct that can hold an index & an address
    struct Solution {
        address verifier;
        bool exists;
    }
    // TODO define an array of the above struct
    // Why an array? I think I do not need it
    // TODO define a mapping to store unique solutions submitted
    mapping(bytes32 => Solution) private solutions;
    // TODO Create an event to emit when a solution is added
    event NewSolution(bytes32 key, address verifier);

    modifier requireNewSolution(bytes32 solutionKey) {
        require(!solutionExists(solutionKey), "Solution exists");
        _;
    }

    function solutionExists(bytes32 solutionKey)
        internal
        view
        returns (bool isNew)
    {
        isNew = solutions[solutionKey].exists;
    }

    // TODO Create a function to add the solutions to the array and emit the event
    function addSolution(bytes32 solutionKey, address verifier)
        internal
        requireNewSolution(solutionKey)
    {
        solutions[solutionKey].verifier = verifier;
        solutions[solutionKey].exists = true;
        emit NewSolution(solutionKey, verifier);
    }

    // TODO Create a function to mint new NFT only after the solution has been verified
    //  - make sure the solution is unique (has not been used before)
    //  - make sure you handle metadata as well as tokenSuplly
    function verifiedMint(
        address to,
        uint256 tokenId,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory inputs
    ) public {
        bytes32 key = keccak256(abi.encodePacked(a, b, c, inputs));
        require(!solutionExists(key), "Solution exists");
        require(verifyTx(a, b, c, inputs), "Invalid proof");
        addSolution(key, msg.sender);
        super.mint(to, tokenId);
    }
}
