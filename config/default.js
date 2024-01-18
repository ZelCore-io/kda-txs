const dbsecrets = require('./dbsecrets');

module.exports = {
  server: {
    port: 9876,
  },
  database: {
    url: '127.0.0.1',
    port: 27017,
    database: dbsecrets.dbname,
    username: dbsecrets.dbusername,
    password: dbsecrets.dbpassword,
  },
  collections: {
    txs: 'txs', // txDetail, requestKey
  },
  apiUrl: 'https://kadena.dapp.runonflux.io',
};
