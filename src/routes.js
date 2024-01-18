const kdaApi = require('./apiServices/kdaApi');

module.exports = (app) => {
  // return sync data
  app.get('/v1/txs/:account?/:namespace?/:limit?', (req, res) => {
    kdaApi.getTxs(req, res);
  });
};
