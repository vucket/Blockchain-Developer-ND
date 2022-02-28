const MorsaHomeERC721Mintable = artifacts.require("MorsaHomeERC721Mintable");

contract("MorsaHomeERC721Mintable", (accounts) => {
  const owner = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];
  let MAX_TOKEN_ID = 0;

  describe("match erc721 spec", function () {
    let contract;
    beforeEach(async function () {
      contract = await MorsaHomeERC721Mintable.new({ from: owner });

      await contract.mint(account1, 0, { from: owner });
      MAX_TOKEN_ID++;
      await contract.mint(account1, 1, { from: owner });
      MAX_TOKEN_ID++;

      await contract.mint(account2, 2, { from: owner });
      MAX_TOKEN_ID++;
      await contract.mint(account2, 3, { from: owner });
      MAX_TOKEN_ID++;
    });

    it("should return total supply", async function () {
      const result = await contract.totalSupply.call();
      assert.equal(result, MAX_TOKEN_ID);
    });

    it("should get token balance", async function () {
      const result = await contract.balanceOf.call(account1);
      assert.equal(result, 2);
    });

    // token uri should be complete i.e: https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1
    it("should return token uri", async function () {
      const result = await contract.tokenURI.call(1);
      assert.equal(
        result,
        "https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1"
      );
    });

    it("should transfer token from one owner to another", async function () {
      await contract.transferFrom(account1, account2, 1, {
        from: account1,
      });
      const result = await contract.ownerOf.call(1);
      assert.equal(result, account2);
    });
  });

  describe("have ownership properties", function () {
    let contract;
    beforeEach(async function () {
      contract = await MorsaHomeERC721Mintable.new({ from: owner });
    });

    it("should fail when minting when address is not contract owner", async function () {
      let failed = false;
      try {
        await contract.mint(account2, 1, { from: account1 });
      } catch (e) {
        failed = true;
      }
      assert.equal(failed, true, "Non-owner able to mint coins");
    });

    it("should return contract owner", async function () {
      const result = await contract.getOwner.call();
      assert.equal(result, owner);
    });
  });
});
