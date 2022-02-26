const HDWalletProvider = require("truffle-hdwallet-provider");
const fs = require("fs");
const infuraKey = fs.readFileSync("secrets/.infuraKey").toString().trim();
const mnemonic = fs.readFileSync("secrets/.mnemonic").toString().trim();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*", // Match any network id
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://rinkeby.infura.io/v3/${infuraKey}`
        ),
      network_id: 4,
      gas: 4500000,
      gasPrice: 10000000000,
    },
  },
};
