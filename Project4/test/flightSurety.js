var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ACT
    try {
      await config.flightSuretyApp.registerAirline(config.firstAirline);
    } catch (e) {}
    const result = await config.flightSuretyData.isAirlineRegistered.call(
      config.firstAirline
    );

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("(airline) cannot fund if value is less than 10 eth", async () => {
    try {
      await config.flightSuretyApp.fundAirline({
        value: web3.utils.toWei("9", "ether"),
      });
    } catch (e) {}
    const result = await config.flightSuretyData.isAirlineFunded.call(
      config.owner
    );
    assert.equal(result, false, "Airline not be able to fund");
  });

  it("(airline) can fund", async () => {
    const isOperational = await config.flightSuretyData.isOperational.call();
    const registered = await config.flightSuretyData.isAirlineRegistered.call(
      config.owner
    );
    try {
      await config.flightSuretyApp.fundAirline({
        from: config.owner,
        value: web3.utils.toWei("15", "ether"),
        gas: 5000000,
        gasPrice: 100000000000,
      });
    } catch (e) {
      console.log("ERR", e);
    }
    const funded = await config.flightSuretyData.isAirlineFunded.call(
      config.owner
    );
    assert.equal(isOperational, true, "Should be operable");
    assert.equal(registered, true, "Airline should be registered");
    assert.equal(funded, true, "Airline should be funded");
  });
  it("(airline) can register airline", async () => {
    try {
      await config.flightSuretyApp.registerAirline(config.firstAirline, {
        from: config.owner,
      });
    } catch (e) {
      console.log("ERR", e);
    }
    const result = await config.flightSuretyData.isAirlineRegistered.call(
      config.firstAirline
    );

    assert.equal(result, true, "Airline should be registered");
  });
  it("(psg) can buyInsurance", async () => {
    let err = false;
    try {
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "F1", {
        from: config.testAddresses[0],
        value: web3.utils.toWei("0.7", "ether"),
      });
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "F3", {
        from: config.testAddresses[0],
        value: web3.utils.toWei("0.7", "ether"),
      });
    } catch (e) {
      err = true;
      console.log("ERR", e);
    }
    assert.equal(err, false);
  });
  it("(psg) cannot claimInsurance", async () => {
    try {
      await config.flightSuretyApp.claimInsurance(config.firstAirline, "F1", {
        from: config.testAddresses[0],
      });
    } catch (e) {
      err = true;
      console.log("ERR", e);
    }
    assert.equal(err, true);
  });
  it("(psg) can claimInsurance", async () => {
    try {
      await config.flightSuretyApp.claimInsurance(config.firstAirline, "F3", {
        from: config.testAddresses[0],
      });
    } catch (e) {
      err = true;
      console.log("ERR", e);
    }
    assert.equal(err, false);
  });
  it("(psg) can refundInsurance", async () => {
    try {
      await config.flightSuretyApp.refundInsurance(
        config.testAddresses[0],
        config.firstAirline,
        "F3",
        {
          from: config.owner,
        }
      );
    } catch (e) {
      err = true;
      console.log("ERR", e);
    }
    assert.equal(err, false);
  });
});
