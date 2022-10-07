var Web3 = require('web3');
var fs = require('fs');
const readLine = require('readline');

const beanstalkAbi = require('./Beanstalk.json');
const BEANSTALK_ADDRESS = '0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5' // Beanstalk's address
const RPC_URL = '<RPC_URL>' // RPC URL
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
const beanstalk = new web3.eth.Contract(beanstalkAbi, BEANSTALK_ADDRESS);

function toBN(a) {
    return web3.utils.toBN(a)
}

function subStrings(str1, str2) {
    return toBN(str1).sub(toBN(str2)).toString()
}

async function getAccounts() {
    let addDepositEvents = (await Promise.all([
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 0, toBlock: 15278000 }),
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 15278000, toBlock: 15290000 }),
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 15290000, toBlock: 15297000 }),
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 15278704, toBlock: 15297000 }),
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 15297000, toBlock: 15327000 }),
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 15327000, toBlock: 15600000 }),
        await beanstalk.getPastEvents('AddDeposit', { fromBlock: 15600000 })
    ])).flat()

    accounts = Array.from(new Set(addDepositEvents.map((ad) => ad.returnValues.account)))
    return accounts
}

async function getEmitted(accounts) {
    const events = await Promise.all(accounts.map((account) => 
        Promise.all([
            beanstalk.getPastEvents('StalkBalanceChanged', { fromBlock: 0,  filter: { account: account } }),
            beanstalk.getPastEvents('SeedsBalanceChanged', { fromBlock: 0,  filter: { account: account } })
        ])
    ))

    const balances = accounts.reduce((balances, account, i) => {
        balances[account] = {
            stalk: events[i][0].reduce((stalk, e) => stalk.add(toBN(e.returnValues.delta)), toBN('0')).toString(),
            roots: events[i][0].reduce((stalk, e) => stalk.add(toBN(e.returnValues.deltaRoots)), toBN('0')).toString(),
            seeds: events[i][1].reduce((stalk, e) => stalk.add(toBN(e.returnValues.delta)), toBN('0')).toString(),
        }
        return balances;
    }, {})
    await fs.writeFileSync(`./data/emittedBalances.json`, JSON.stringify(balances, null, 4));
}

async function getOnchainBalances(account) {
    let onChainBalances = await Promise.all([
        await beanstalk.methods.balanceOfStalk(account).call(),
        await beanstalk.methods.balanceOfEarnedStalk(account).call(),
        await beanstalk.methods.balanceOfRoots(account).call(),
        await beanstalk.methods.balanceOfSeeds(account).call(),
    ])
    onChainBalances = {
        stalk: subStrings(onChainBalances[0],onChainBalances[1]),
        roots: onChainBalances[2],
        seeds: onChainBalances[3]
    }
    return onChainBalances
}

async function getOnChain(accounts) {
    let balances = await Promise.all(accounts.map((account) => getOnchainBalances(account)))
    balances = accounts.reduce((b, account, i) => {
        b[account] = balances[i]
        return b
    }, {})
    await fs.writeFileSync(`./data/onChainBalances.json`, JSON.stringify(balances, null, 4));
}

async function generateDelta() {
    const emittedBalances = JSON.parse(await fs.readFileSync('./data/emittedBalances.json'));
    const onChainBalances = JSON.parse(await fs.readFileSync('./data/onChainBalances.json'));
    deltaBalances = Object.entries(onChainBalances).reduce((dBalances, [account, balance]) => {
        if (!emittedBalances[account]) {
            dBalances[account] = balance
        } 
        else {
            eBalance = emittedBalances[account]
            dBalances[account] = {
                stalk: subStrings(balance.stalk, eBalance.stalk),
                roots: subStrings(balance.roots, eBalance.roots),
                seeds: subStrings(balance.seeds, eBalance.seeds)
            }
        }
        if (
            dBalances[account].stalk == '0' &&
            dBalances[account].roots == '0' &&
            dBalances[account].seeds == '0'
        ) delete dBalances[account]
        return dBalances
    }, {})

    const balancesArray = Object.entries(deltaBalances).map(([account, b]) => [account, b.stalk, b.roots, b.seeds])
    console.log(`Found ${Object.keys(deltaBalances).length} Different Balances`)
    await fs.writeFileSync(`./data/deltaBalances.json`, JSON.stringify(deltaBalances, null, 4));
    await fs.writeFileSync(`./data/events.json`, JSON.stringify(balancesArray, null, 4));
}

(async () => {
    const accounts = await getAccounts()
    await getOnChain(accounts)
    await getEmitted(accounts)
    await generateDelta()
})();