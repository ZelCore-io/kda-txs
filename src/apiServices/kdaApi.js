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
    let { limit } = req.params;
    limit = Number(limit || req.query.limit || 50) || 50;
    if (limit > 10000) {
      limit = 10000;
    }
    const txs = await kdaService.getTxsForAccount(account, namespace, limit) || [];
    res.json(txs);
  } catch (error) {
    log.error(error);
    res.sendStatus(404);
  }
}

module.exports = {
  getTxs,
};
