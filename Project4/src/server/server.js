import "regenerator-runtime/runtime";

import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

const flightStatusCodes = [0, 10, 20, 30, 40, 50];
const oracles = [];
const INITIAL_ORACLE_ACCOUNT_IDX = 5;
const MAX_ORACLES = 20;
const config = Config["localhost"];
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
const flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);
const FEE = web3.utils.toWei("1", "ether");

const registerEvents = () => {
  flightSuretyApp.events.OracleRequest(async (error, event) => {
    if (error) console.log(error);
    console.log(event);
    const airline = event.returnValues[1];
    const flightCode = event.returnValues[2];
    const stamp = event.returnValues[3];

    for (let i = 0; i < oracles.length; i++) {
      const statusCode =
        flightStatusCodes[Math.floor(Math.random() * flightStatusCodes.length)];

      const indexes = oracles[i].indexes;

      for (let j = 0; j < indexes.length; j++) {
        try {
          await flightSuretyApp.methods
            .submitOracleResponse(
              indexes[j],
              airline,
              flightCode,
              stamp,
              statusCode
            )
            .send({ from: oracles[i].oracle, gas: 999999999 });
        } catch (e) {
          console.log(e);
        }
      }
    }
  });
};

const registerOracles = async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    web3.eth.defaultAccount = web3.eth.accounts[0];
    for (let i = 0; i < MAX_ORACLES; i++) {
      const account = accounts[i + INITIAL_ORACLE_ACCOUNT_IDX];
      console.log("ORACLE START");
      await flightSuretyApp.methods.registerOracle().send({
        from: account,
        value: FEE,
        gas: 5000000,
        gasPrice: 100000000000,
      });

      console.log("ORACLE REGISTERED");
      const indexesRes = await flightSuretyApp.methods.getMyIndexes().call({
        from: account,
        gas: 5000000,
        gasPrice: 100000000000,
      });
      const newOracle = { oracle: account, indexes: indexesRes };
      oracles.push(newOracle);
      console.log(`New Oracle ${newOracle}`);
    }
  } catch (err) {
    console.log("ERR", err);
  }
};

registerOracles();
registerEvents();
const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
