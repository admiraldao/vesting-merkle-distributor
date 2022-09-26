require("@nomiclabs/hardhat-waffle");

require('hardhat-gas-reporter');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local'],
      gas: 8000000,
      gasPrice: 15000000000,
    },
    hardhat: {
      forking: {
        url: 'https://eth-mainnet.alchemyapi.io/v2/'+process.env.ALCHEMY_API_KEY,
        blockNumber: 15000000, // Nice round number on June 21, 2022
      },
      saveDeployments: true,
    },
  },
};
