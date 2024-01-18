const config = require('config');
const serviceHelper = require('./serviceHelper');

const { apiUrl } = config;

async function getMultipleTxs(requestKeys) {
  const promises = [];
  // get the request keys from our database
  const db = await serviceHelper.databaseConnection();
  const database = db.db(config.database.database);
  const query = { requestKey: { $in: requestKeys } };
  const projetion = { requestKey: 1, txDetail: 1 };
  const txDetails = await serviceHelper.findInDatabase(database, config.collections.txs, query, projetion);
  // get requests key that are missing in our database
  const missingRequestKeys = requestKeys.filter((key) => !txDetails.find((tx) => tx.requestKey === key));
  // if we have some missing request keys, we need to fetch them from the api
  // eslint-disable-next-line no-restricted-syntax
  for (const requestKey of missingRequestKeys) {
    promises.push(serviceHelper.axiosGet(`${apiUrl}/txs/tx?requestkey=${requestKey}`));
  }
  if (promises.length) {
    const txDetailsFromApi = await Promise.all(promises).catch((e) => { console.log(e); return []; });
    // eslint-disable-next-line no-restricted-syntax
    for (const tx of txDetailsFromApi) {
      if (tx.data) {
        // update these txs in our database
        // eslint-disable-next-line no-await-in-loop
        await serviceHelper.findOneAndUpdateInDatabase(database, config.collections.txs, { requestKey: tx.data.requestKey }, { $set: tx.data });
        txDetails.push(tx.data);
      }
    }
  }
  return txDetails;
}

async function getTxsForAccount(account, namespace, limit = 50) {
  const txUrl = `${apiUrl}/txs/account/${account}?token=${namespace}&offset=0&limit=${limit}`;
  const { data } = await serviceHelper.axiosGet(txUrl, {
    timeout: 30000,
  });
  if (typeof data !== 'object') { throw new Error('Transactions are not an object'); }
  const requestKeys = data.map((tx) => tx.requestKey); // this might take forever. Create new endpoint on api to get all txs for an address
  if (namespace !== 'coin') {
    // fetch for coin as well
    const coinTxUrl = `${apiUrl}/txs/account/${account}?token=coin&offset=0&limit=${limit}`;
    const { data: coinData } = await serviceHelper.axiosGet(coinTxUrl, {
      timeout: 30000,
    });
    if (typeof coinData !== 'object') { throw new Error('Transactions are not an object'); }
    const coinRequestKeys = coinData.map((tx) => tx.requestKey); // this might take forever. Create new endpoint on api to get all txs for an address
    requestKeys.push(...coinRequestKeys);
  }
  // create new set of requestKeys to remove duplicates
  const uniqueRequestKeys = new Set(requestKeys);
  // convert back to array
  requestKeys.length = 0;
  requestKeys.push(...uniqueRequestKeys);
  const txDetails = await getMultipleTxs(requestKeys);
  return txDetails;
}

module.exports = {
  getMultipleTxs,
  getTxsForAccount,
};
