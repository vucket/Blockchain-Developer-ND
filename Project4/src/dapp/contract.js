import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
    this.flights = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      const airline = this.airlines[0];
      const timestamp = new Date(Date.now() - 100000);
      this.flights.push({
        airline: airline,
        flightCode: "F1",
        timestamp: timestamp,
      });
      this.flights.push({
        airline: airline,
        flightCode: "F2",
        timestamp: timestamp,
      });

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }

  fundAirline(value, callback) {
    const owner = this.owner;
    this.flightSuretyApp.methods
      .fundAirline()
      .send({ from: owner, value }, (error, result) => {
        callback(error, result);
      });
  }

  buyInsurance(flightInfo, value, callback) {
    const owner = this.owner;
    this.flightSuretyApp.methods
      .buyInsurance(flightInfo.airline, flightInfo.flightCode)
      .send({ from: owner, value }, (error, result) => {
        callback(error, result);
      });
  }
  claimInsurance(flightInfo, callback) {
    const owner = this.owner;
    this.flightSuretyApp.methods
      .claimInsurance(flightInfo.airline, flightInfo.flightCode)
      .send({ from: owner }, (error, result) => {
        callback(error, result);
      });
  }
  payCredit(passenger, flightInfo, callback) {
    const owner = this.owner;
    this.flightSuretyApp.methods
      .refundInsurance(passenger, flightInfo.airline, flightInfo.flightCode)
      .send({ from: owner }, (error, result) => {
        callback(error, result);
      });
  }
}
