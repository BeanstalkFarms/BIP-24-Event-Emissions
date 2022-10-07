# Computing Silo Balance Changes not Emitted in Events
Before BIP-24, Beanstalk did not emit a `StalkBalanceChanged` or `SeedsBalanceChanged` event on Deposit transfers. In BIP-24, Stalk Holders voted to retroactively emit events that were missed.

This repository generates the `events.json` that will be the input payload into the Init contract here:
https://github.com/BeanstalkFarms/Beanstalk/blob/master/protocol/contracts/farm/init/InitSiloEvents.sol

## Generating
1. `npm install` to install `web3` package
2. add replace `<RPC_URL>` with an RPC URL in line 7 of `generate.js`
3. run `node generate.js` (It will take some time to execute)
4. View `data/events.json` to see the output