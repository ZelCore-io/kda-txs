const config = require('config');
const plimit = require('p-limit');
const serviceHelper = require('./serviceHelper');

const ppLimit = plimit(100);

const { apiUrl } = config;

async function getMultipleTxs(requestKeys) {
  const promises = [];
  // get the request keys from our database
  const db = await serviceHelper.databaseConnection();
  const database = db.db(config.database.database);
  const query = { requestKey: { $in: requestKeys } };
  const projetion = { requestKey: 1, txDetail: 1 };
  console.log(`Total ${requestKeys.length} request keys`);
  const txDetails = await serviceHelper.findInDatabase(database, config.collections.txs, query, projetion);
  console.log(`Using ${txDetails.length} txs from database`);
  // get requests key that are missing in our database
  const missingRequestKeys = requestKeys.filter((key) => !txDetails.find((tx) => tx.requestKey === key));
  // if we have some missing request keys, we need to fetch them from the api
  // eslint-disable-next-line no-restricted-syntax
  for (const requestKey of missingRequestKeys) {
    promises.push(ppLimit(() => serviceHelper.axiosGet(`${apiUrl}/txs/tx?requestkey=${requestKey}`)));
  }
  if (promises.length) {
    console.log(`Fetching ${promises.length} txs from api`);
    const data = await Promise.allSettled(promises).catch((e) => { console.log(e); return []; });
    const txDetailsFromApi = data.filter((tx) => tx.status === 'fulfilled').map((tx) => tx.value);
    // eslint-disable-next-line no-restricted-syntax
    for (const tx of txDetailsFromApi) {
      if (tx.data) {
        // update these txs in our database
        // eslint-disable-next-line no-await-in-loop
        await serviceHelper.findOneAndUpdateInDatabase(database, config.collections.txs, { requestKey: tx.data.requestKey }, { $set: tx.data }, { upsert: true });
        txDetails.push(tx.data);
      }
    }
  }
  return txDetails;
}

async function fetchTxs(account, namespace, limit = 50, offset = 0) {
  // api provides max 250
  const txUrl = `${apiUrl}/txs/account/${account}?token=${namespace}&offset=${offset}&limit=${limit}`;
  const { data } = await serviceHelper.axiosGet(txUrl, {
    timeout: 30000,
  });
  if (typeof data !== 'object') { throw new Error('Transactions are not an object'); }
  const txsFetchedCoin = data;
  let requestKeysfetched = data.length;
  console.log(requestKeysfetched, txsFetchedCoin.length, limit);
  let offsetA = offset;
  while (requestKeysfetched === 250 && txsFetchedCoin.length < limit) {
    offsetA += 250;
    let adjLimit = limit;
    if (offsetA + 250 > adjLimit) {
      adjLimit -= offsetA;
    }
    const nextTxUrl = `${apiUrl}/txs/account/${account}?token=${namespace}&offset=${offsetA}&limit=${adjLimit}`;
    // eslint-disable-next-line no-await-in-loop
    const { data: nextData } = await serviceHelper.axiosGet(nextTxUrl, {
      timeout: 30000,
    });
    if (typeof nextData !== 'object') { throw new Error('Transactions are not an object'); }
    txsFetchedCoin.push(...nextData);
    console.log(nextData.length);
    requestKeysfetched = nextData.length;
  }

  const requestKeys = data.map((tx) => tx.requestKey);

  if (namespace !== 'coin') {
    // fetch for coin as well
    const txsFetched = [];
    const coinTxUrl = `${apiUrl}/txs/account/${account}?token=coin&offset=${offset}&limit=${limit}`;
    const { data: coinData } = await serviceHelper.axiosGet(coinTxUrl, {
      timeout: 30000,
    });
    if (typeof coinData !== 'object') { throw new Error('Transactions are not an object'); }
    txsFetched.push(...coinData);
    let txsFetchedLength = coinData.length;
    let offsetB = offset;
    while (txsFetchedLength === 250 && txsFetched.length < limit) {
      offsetB += 250;
      let adjLimit = limit;
      if (offsetB + 250 > adjLimit) {
        adjLimit -= offsetB;
      }
      const nextCoinTxUrl = `${apiUrl}/txs/account/${account}?token=coin&offset=${offsetB}&limit=${adjLimit}`;
      // eslint-disable-next-line no-await-in-loop
      const { data: nextCoinData } = await serviceHelper.axiosGet(nextCoinTxUrl, {
        timeout: 30000,
      });
      if (typeof nextCoinData !== 'object') { throw new Error('Transactions are not an object'); }
      txsFetched.push(...nextCoinData);
      txsFetchedLength = nextCoinData.length;
    }
    const namespaceRequestKeys = txsFetched.map((tx) => tx.requestKey);
    requestKeys.push(...namespaceRequestKeys);
  }
  return requestKeys;
}

async function getTxsForAccount(account, namespace, limit = 50) {
  const requestKeys = await fetchTxs(account, namespace, limit);
  // create new set of requestKeys to remove duplicates
  const uniqueRequestKeys = [...new Set(requestKeys)];
  const txDetails = await getMultipleTxs(uniqueRequestKeys);
  return txDetails;
}

module.exports = {
  getMultipleTxs,
  getTxsForAccount,
};
