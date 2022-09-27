/* eslint-disable new-cap */
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const erc20 = require('./abis/erc20.abi');
const fs = require('fs');

const BN = BigNumber; // Abbreviate BigNumber. We use this lib a lot.

describe('Vesting Merkle Tests', function() {
  let vmdFactory;
  let merkleObject;
  let claimZero;
  let claimOne;
  let richGuy;
  let richGuyAugur;

  let snapshot;

  const AUGUR_REP_ADDRESS = '0x221657776846890989a759BA2973e427DfF5C9bB';
  const RICH_GUY_ADDRESS = '0x28C6c06298d514Db089934071355E5743bf21d60';

  const RECIPIENT_ZERO_ADDRESS = '0x02Da682238ff9D89f1974653f33aD6A679642B95';
  const RECIPIENT_ONE_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

  async function sendInAsset(contractAddress) {
    richGuyAugur = await ethers.getContractAt(erc20, AUGUR_REP_ADDRESS, richGuy);
    await richGuyAugur.transfer(contractAddress, merkleObject.tokenTotal);
  }

  before(async function() {
    // Deploy Verifier.
    vmdFactory = await ethers.getContractFactory('VestingMerkleDistributor');
    merkleObject = JSON.parse(fs.readFileSync('scripts/example_output.json'));

    claimZero = merkleObject['claims'][RECIPIENT_ZERO_ADDRESS];
    claimOne = merkleObject['claims'][RECIPIENT_ONE_ADDRESS];

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [RICH_GUY_ADDRESS],
    });
    richGuy = await ethers.provider.getSigner(RICH_GUY_ADDRESS);

    // take a snapshot of the current state of the blockchain
    snapshot = await helpers.takeSnapshot();
  });

  beforeEach(async function() {
    await snapshot.restore();
  });

  it('Deployment tests', async function() {
    const timestamp = await helpers.time.latest();

    await expect(vmdFactory.deploy(AUGUR_REP_ADDRESS, merkleObject['merkleRoot'], timestamp+1, timestamp)).to.be.revertedWith('Invalid interval');


    const vmd = await vmdFactory.deploy(AUGUR_REP_ADDRESS, merkleObject['merkleRoot'], timestamp, timestamp);
    await vmd.deployed();

    expect(await vmd.MERKLE_ROOT()).to.equal(merkleObject['merkleRoot']);
    expect(await vmd.TOKEN_ADDRESS()).to.equal(AUGUR_REP_ADDRESS);
    expect(await vmd.getVestingStartAndEnd()+'').to.equal(timestamp+','+timestamp);
  });

  it('Cannot withdraw with a bad proof or before specified interval ', async function() {
    const futureTimestamp = await helpers.time.latest()+10000;

    const vmd = await vmdFactory.deploy(AUGUR_REP_ADDRESS, merkleObject['merkleRoot'], futureTimestamp, futureTimestamp);
    await vmd.deployed();

    expect(await vmd.fractionVested()).to.equal(0);

    // claimVested(uint256 index, address account, uint256 tokenGrant, bytes32[] calldata merkleProof)

    let tx = vmd.claimVested(1, RECIPIENT_ONE_ADDRESS, claimZero.amount, claimOne.proof);
    await expect(tx).to.be.revertedWith('Invalid proof');

    tx = vmd.claimVested(0, RECIPIENT_ZERO_ADDRESS, claimZero.amount, claimOne.proof);
    await expect(tx).to.be.revertedWith('Invalid proof');

    tx = vmd.claimVested(0, RECIPIENT_ZERO_ADDRESS, claimZero.amount, claimZero.proof);
    await expect(tx).to.be.revertedWith('Nothing to claim');

    tx = vmd.claimVested(1, RECIPIENT_ONE_ADDRESS, claimOne.amount, claimOne.proof);
    await expect(tx).to.be.revertedWith('Nothing to claim');
  });

  it('Can fully withdraw after end of vesting', async function() {
    const pastTimestamp = await helpers.time.latest()-10000;

    const vmd = await vmdFactory.deploy(AUGUR_REP_ADDRESS, merkleObject['merkleRoot'], pastTimestamp, pastTimestamp);
    await vmd.deployed();

    await sendInAsset(vmd.address);

    expect(await vmd.fractionVested()).to.equal(255);

    // claimVested(uint256 index, address account, uint256 tokenGrant, bytes32[] calldata merkleProof)

    let tx = vmd.claimVested(1, RECIPIENT_ONE_ADDRESS, claimOne.amount, claimOne.proof);
    await expect(tx).to.emit(vmd, 'Claimed').withArgs(RECIPIENT_ONE_ADDRESS, claimOne.amount);
    expect(await richGuyAugur.balanceOf(RECIPIENT_ONE_ADDRESS)).to.equal(BN.from(claimOne.amount));

    expect(await vmd.getClaimAmount(0)).to.equal(0);
    expect(await vmd.getClaimAmount(1)).to.equal(255);
    expect(await vmd.getClaimAmount(2)).to.equal(0);

    tx = vmd.claimVested(1, RECIPIENT_ONE_ADDRESS, claimOne.amount, claimOne.proof);
    await expect(tx).to.be.revertedWith('Nothing to claim');

    tx = vmd.claimVested(0, RECIPIENT_ZERO_ADDRESS, claimZero.amount, claimZero.proof);
    await expect(tx).to.emit(vmd, 'Claimed').withArgs(RECIPIENT_ZERO_ADDRESS, claimZero.amount);
    expect(await richGuyAugur.balanceOf(RECIPIENT_ZERO_ADDRESS)).to.equal(BN.from(claimZero.amount));

    tx = vmd.claimVested(0, RECIPIENT_ZERO_ADDRESS, claimZero.amount, claimZero.proof);
    await expect(tx).to.be.revertedWith('Nothing to claim');

    expect(await vmd.getClaimAmount(0)).to.equal(255);
    expect(await vmd.getClaimAmount(1)).to.equal(255);
    expect(await vmd.getClaimAmount(2)).to.equal(0);
  });

  it('Partial vesting works as expected', async function() {
    const pastTimestamp = await helpers.time.latest()-10000;
    const futureTimestamp = pastTimestamp + 50000;

    const vmd = await vmdFactory.deploy(AUGUR_REP_ADDRESS, merkleObject['merkleRoot'], pastTimestamp, futureTimestamp);
    await vmd.deployed();

    await sendInAsset(vmd.address);
    // 20% should be vested (~10,001 of 50,000)
    expect(await vmd.fractionVested()).to.equal(51);

    let tx = vmd.claimVested(1, RECIPIENT_ONE_ADDRESS, claimOne.amount, claimOne.proof);
    await expect(tx).to.emit(vmd, 'Claimed').withArgs(RECIPIENT_ONE_ADDRESS, claimOne.amount/5);
    expect(await richGuyAugur.balanceOf(RECIPIENT_ONE_ADDRESS)).to.equal(BN.from(claimOne.amount).div(5));

    expect(await vmd.getClaimAmount(0)).to.equal(0);
    expect(await vmd.getClaimAmount(1)).to.equal(51);
    expect(await vmd.getClaimAmount(2)).to.equal(0);


    await helpers.time.increaseTo(pastTimestamp+20000);

    tx = vmd.claimVested(0, RECIPIENT_ZERO_ADDRESS, claimZero.amount, claimZero.proof);
    await expect(tx).to.emit(vmd, 'Claimed').withArgs(RECIPIENT_ZERO_ADDRESS, 2*claimZero.amount/5);
    expect(await richGuyAugur.balanceOf(RECIPIENT_ZERO_ADDRESS)).to.equal(BN.from(claimZero.amount).mul(2).div(5));

    expect(await vmd.getClaimAmount(0)).to.equal(102);
    expect(await vmd.getClaimAmount(1)).to.equal(51);
    expect(await vmd.getClaimAmount(2)).to.equal(0);

    tx = vmd.claimVested(1, RECIPIENT_ONE_ADDRESS, claimOne.amount, claimOne.proof);
    await expect(tx).to.emit(vmd, 'Claimed').withArgs(RECIPIENT_ONE_ADDRESS, claimOne.amount/5);
    expect(await richGuyAugur.balanceOf(RECIPIENT_ONE_ADDRESS)).to.equal(BN.from(claimOne.amount).mul(2).div(5));

    expect(await vmd.getClaimAmount(0)).to.equal(102);
    expect(await vmd.getClaimAmount(1)).to.equal(102);
    expect(await vmd.getClaimAmount(2)).to.equal(0);
  });
});
