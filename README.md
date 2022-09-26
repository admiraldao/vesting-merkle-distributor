# Vesting Merkle Distributor

Starting from https://github.com/Uniswap/merkle-distributor/

Updated to use Solidity 0.8 and hardhat

Token vesting is in 8 bits (1/255th is minimum increment)

## Preparing the input
Prepare a JSON file that maps addresses to the numeric (base 10) or string (base 16) number of tokens. See `example.json`.

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

