const StarNotary = artifacts.require("StarNotary");

let myContract;
let starTokenId = 1;

const getNewStarId = () => {
  return ++starTokenId;
};

contract("StarNotary", (accs) => {
  accounts = accs;
  owner = accounts[0];
});
before(async () => {
  myContract = await StarNotary.deployed();
});

it("can Create a Star", async () => {
  const tokenId = getNewStarId();
  await myContract.createStar("Awesome Star!", tokenId, { from: accounts[0] });
  const star = await myContract.tokenIdToStarInfo.call(tokenId);
  assert.equal(star.name, "Awesome Star!");
});

it("lets user1 put up their star for sale", async () => {
  const user1 = accounts[1];
  const starId = getNewStarId();
  const starPrice = web3.utils.toWei(".01", "ether");
  await myContract.createStar("awesome star", starId, { from: user1 });
  await myContract.putStarUpForSale(starId, starPrice, { from: user1 });
  assert.equal(await myContract.starsForSale.call(starId), starPrice);
});

it("lets user1 get the funds after the sale", async () => {
  const user1 = accounts[1];
  const user2 = accounts[2];
  const starId = getNewStarId();
  const starPrice = web3.utils.toWei(".01", "ether");
  const balance = web3.utils.toWei(".05", "ether");
  await myContract.createStar("awesome star", starId, { from: user1 });
  await myContract.putStarUpForSale(starId, starPrice, { from: user1 });
  const balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user1);
  await myContract.buyStar(starId, { from: user2, value: balance });
  const balanceOfUser1AfterTransaction = await web3.eth.getBalance(user1);
  const value1 = Number(balanceOfUser1BeforeTransaction) + Number(starPrice);
  const value2 = Number(balanceOfUser1AfterTransaction);
  assert.equal(value1, value2);
});

it("lets user2 buy a star, if it is put up for sale", async () => {
  const user1 = accounts[1];
  const user2 = accounts[2];
  const starId = getNewStarId();
  const starPrice = web3.utils.toWei(".01", "ether");
  const balance = web3.utils.toWei(".05", "ether");
  await myContract.createStar("awesome star", starId, { from: user1 });
  await myContract.putStarUpForSale(starId, starPrice, { from: user1 });
  await myContract.buyStar(starId, { from: user2, value: balance });
  assert.equal(await myContract.ownerOf.call(starId), user2);
});

it("lets user2 buy a star and decreases its balance in ether", async () => {
  const user1 = accounts[1];
  const user2 = accounts[2];
  const starId = getNewStarId();
  const starPrice = web3.utils.toWei(".01", "ether");
  const balance = web3.utils.toWei(".05", "ether");
  await myContract.createStar("awesome star", starId, { from: user1 });
  await myContract.putStarUpForSale(starId, starPrice, { from: user1 });
  const balanceOfUser2BeforeTransaction = await web3.eth.getBalance(user2);
  await myContract.buyStar(starId, {
    from: user2,
    value: balance,
    gasPrice: 0,
  });
  const balanceAfterUser2BuysStar = await web3.eth.getBalance(user2);
  const value =
    Number(balanceOfUser2BeforeTransaction) - Number(balanceAfterUser2BuysStar);
  assert.equal(value, starPrice);
});

// Implement Task 2 Add supporting unit tests

it("can add the star name and star symbol properly", async () => {
  // 1. create a Star with different tokenId
  //2. Call the name and symbol properties in your Smart Contract and compare with the name and symbol provided

  await myContract.createStar("star1", getNewStarId(), {
    from: accounts[0],
  });

  assert.equal(await myContract.symbol(), "UHUH");
  assert.equal(await myContract.name(), "MorsaStar");
});

it("lets 2 users exchange stars", async () => {
  // 1. create 2 Stars with different tokenId
  // 2. Call the exchangeStars functions implemented in the Smart Contract
  // 3. Verify that the owners changed
  const user1 = accounts[1];
  const user2 = accounts[2];
  const startId1 = getNewStarId();
  const startId2 = getNewStarId();
  await myContract.createStar("star1", startId1, { from: user1 });
  await myContract.createStar("star2", startId2, { from: user2 });
  await myContract.exchangeStars(startId1, startId2, { from: user1 });
  assert.equal(await myContract.ownerOf.call(startId1), user2);
  assert.equal(await myContract.ownerOf.call(startId2), user1);
});

it("lets a user transfer a star", async () => {
  // 1. create a Star with different tokenId
  // 2. use the transferStar function implemented in the Smart Contract
  // 3. Verify the star owner changed.
  const user1 = accounts[1];
  const user2 = accounts[2];
  const startId1 = getNewStarId();
  await myContract.createStar("star1", startId1, { from: user1 });
  await myContract.transferStar(user2, startId1, { from: user1 });
  assert.equal(await myContract.ownerOf.call(startId1), user2);
});

it("lookUptokenIdToStarInfo test", async () => {
  // 1. create a Star with different tokenId
  // 2. Call your method lookUptokenIdToStarInfo
  // 3. Verify if you Star name is the same
  const user1 = accounts[1];
  const startId1 = getNewStarId();
  await myContract.createStar("TestStar", startId1, { from: user1 });
  assert.equal(await myContract.lookUptokenIdToStarInfo(startId1), "TestStar");
});
