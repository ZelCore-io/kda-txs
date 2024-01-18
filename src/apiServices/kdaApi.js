const kdaService = require('../services/kdaService');
const log = require('../lib/log');

async function getTxs(req, res) {
  try {
    let { account } = req.params;
    account = account || req.query.account;
    if (!account) {
      res.sendStatus(400);
      return;
    }
    let { namespace } = req.params;
    namespace = namespace || req.query.namespace || 'coin';
    const txs = await kdaService.getTxsForAccount(account, namespace) || [];
    res.json(txs);
  } catch (error) {
    log.error(error);
    res.sendStatus(404);
  }
}

module.exports = {
  getTxs,
};
