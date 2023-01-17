# Vesting Merkle Distributor

Starting from https://github.com/Uniswap/merkle-distributor/

* Updated to use Solidity 0.8 and hardhat
* Extends the `claimed` bitmap from a single binary value per address to 8 bits per address, meaning that vesting can take place in 1/255th increments while still being highly gas efficient (Since 256/8 = 32 addresses share the same memory slot)

## Preparing the input
Prepare a JSON file that maps addresses to the number of tokens. See `scripts/example.json`.

## Generating and Verifying the Merkle Root

To generate, execute `generate-merkle-root.ts`
```
$ ts-node scripts/generate-merkle-root.ts -i scripts/example.json > scripts/example_output.json
$ cat scripts/example_output.json 
{"merkleRoot":"0xbe7ad119bb4a3536365f54c054bf5607ac7b0e62e5e6979e14e5234d9df64274","tokenTotal":"0x02bc","claims":{"0x02Da682238ff9D89f1974653f33aD6A679642B95":{"index":0,"amount":"0x0190","proof":["0x77856199da17a1765f7d97e36e3826f6b6690435682906a50437b5b3b097c303"]},"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f":{"index":1,"amount":"0x64","proof":["0x7589a8a38c2e3f23361abc713487567196035d4e50281b1b37d1df988d6aa269","0x7d8fc7358ceca42f22fd74e811782148d69c9ed8be78daa3a406fa26ad7b3a05"]},"0xA1BeEea5652C452aC48288E5A62E89E1397C2A8e":{"index":2,"amount":"0xc8","proof":["0x42baa74f61871bfcde5d2e5caecccc8f025769a6ab69c7d5bd1853f8f1dac30a","0x7d8fc7358ceca42f22fd74e811782148d69c9ed8be78daa3a406fa26ad7b3a05"]}}}
```

To check the generated output file, execute `verify-merkle-root.ts`
```
$ ts-node scripts/verify-merkle-root.ts -i scripts/example_output.json 
Verified proof for 0 0x02Da682238ff9D89f1974653f33aD6A679642B95
Verified proof for 1 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
Verified proof for 2 0xA1BeEea5652C452aC48288E5A62E89E1397C2A8e
Done!
Reconstructed merkle root be7ad119bb4a3536365f54c054bf5607ac7b0e62e5e6979e14e5234d9df64274
Root matches the one read from the JSON? true
```

## Testing Solidity
Use alchemy to fork mainnet:
`$ export ALCHEMY_API_KEY="e5D9bYnpx..."`
Then run `npx hardhat test`

## Deployment
Deploy the contract with the following arguments:
* `address token`: Address of ERC20 token to distribute
* `bytes32 merkleRoot`: Generated from the script
* `uint256 startTimestamp`: Unix timestamp that vesting starts (i.e., 0 distribution)
* `uint256 endTimestamp`: Unix timestamp that vesting should end

After deployment, be sure to transfer the correct amount of the `token` to the contract.

### Common Vesting Use Cases
* **Immediate total vesting**: Set `startTimestamp` and `endTimestamp` to the current unix time.
* **Future total vesting**: Set `startTimestamp` and `endTimestamp` to the desired vesting time. Tokens will not be unlockable until that timestamp.
* **Simple linear vesting**: Set `startTimestamp` to the current unix timestamp and `endTimestamp` to the end of the vesting period.
* **Linear vesting after initial slug**: Set `endTimestamp` to the desired end of the vesting period, and set `startTimestamp` to a point in the past such that (current time - start time) / (end time - start time) is the desired initial fraction.

## Claiming Vested Token
Anyone on the Internet can call `claimVested` with data from the output JSON file. It will result in the appropriate amount of token being transferred to the indexed address. There is **no** reliance on `msg.sender`.

## License
This code is a derivative work of https://github.com/Uniswap/merkle-distributor/ and maintains that work's GPL V3 license.

**Shipyard Software is not responsible for any loss of funds from using this contract**
