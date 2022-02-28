// Test if a new solution can be added for contract - SolnSquareVerifier

// Test if an ERC721 token can be minted for contract - SolnSquareVerifier

const verifier = artifacts.require("SolnSquareVerifier");
const validProof = require("../../zokrates/code/square/proof.json");

contract("SolnSquareVerifier", (accounts) => {
  let contract;
  const owner = accounts[0];
  const account1 = accounts[1];

  before("init contract", async () => {
    contract = await verifier.new({ from: owner });
  });

  describe("Verify minting", async () => {
    it("should add solution", async () => {
      let failed = false;
      try {
        await contract.verifiedMint(
          account1,
          1,
          validProof.proof.a,
          validProof.proof.b,
          validProof.proof.c,
          validProof.inputs,
          { from: owner }
        );
      } catch (e) {
        failed = true;
      }
      assert.equal(failed, false);
    });

    it("should mint token", async () => {
      await contract.mint(account1, 1, { from: owner });
      const result = await contract.balanceOf.call(account1);
      assert.equal(result, 1);
    });
  });
});
