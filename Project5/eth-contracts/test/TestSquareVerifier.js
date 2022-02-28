// define a variable to import the <Verifier> or <renamedVerifier> solidity contract generated by Zokrates

// Test verification with correct proof
// - use the contents from proof.json generated from zokrates steps

// Test verification with incorrect proof
const verifier = artifacts.require("Verifier");
const validProof = require("../../zokrates/code/square/proof.json");

contract("Verifier", async (accounts) => {
  let contract;
  const owner = accounts[0];

  before("init contract", async () => {
    contract = await verifier.new({ from: owner });
  });

  describe("Testing proof", function () {
    it("should verify valid proof", async () => {
      const result = await contract.verifyTx.call(
        validProof.proof.a,
        validProof.proof.b,
        validProof.proof.c,
        validProof.inputs
      );
      assert.equal(result, true);
    });

    it("should recognize invalid proff", async () => {
      const result = await contract.verifyTx.call(
        validProof.proof.a,
        validProof.proof.b,
        validProof.proof.c,
        [7, 7]
      );
      assert.equal(result, false);
    });
  });
});
