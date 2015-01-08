var Promise = require('./bluebird');

var bodyParser = require('body-parser');
var rpc = require('codius-rpc');
var chalk = require('chalk');

var names = require('./lib/util/names');

// Force log color support
chalk.enabled = true;

if (rpc.group.length !== 5) {
  console.error('Must be run with --hosts=5');
  process.exit(1);
}

var common = {
  sender: {
    hostId: 0,
    name: names.getNameWithInitial("S"),
    logName: "SENDER:   ",
    logColor: "green"
  },
  senderGateway: {
    hostId: 1,
    logName: "SNDR-GW:  ",
    logColor: "red"
  },
  trader: {
    hostId: 2,
    name: names.getNameWithInitial("T"),
    logName: "TRADER:   ",
    logColor: "blue"
  },
  merchantGateway: {
    hostId: 3,
    logName: "MCHNT-GW: ",
    logColor: "yellow"
  },
  merchant: {
    hostId: 4,
    name: names.getNameWithInitial("M"),
    logName: "MERCHANT: ",
    logColor: "magenta"
  }
};

common.log = require('./lib/util/log')(common);

var server;
switch (rpc.hostId) {
  case common.sender.hostId:
    server = require('./lib/roles/sender')(common, {});
    Promise.delay(250).then(function (){
      // The payment the sender would like to make
      return Promise.promisify(server.pay)({payment: {
        // Description of the sending account
        source: {
          owner: common.sender.hostId,
          // We want the trader to tell us the amount to pay
          // value: ???
          currency: 'USD',
          issuer: common.senderGateway.hostId
        },
        // Description of the receiving account and amount
        destination: {
          owner: common.merchant.hostId,
          value: 100,
          currency: 'EUR',
          issuer: common.merchantGateway.hostId
        }
      }});
    });
    break;
  case common.senderGateway.hostId:
    server = require('./lib/roles/gateway')(common, {
      balances: {
        "0": 200,
        "2": 0
      }
    });
    break;
  case common.trader.hostId:
    server = require('./lib/roles/trader')(common, {
      // The rates that the market maker is willing to trade at
      rates: {
        "USD/1:EUR/3":     1.2,
        "EUR/3:USD/1": 1 / 1.2
      }
    });
    break;
  case common.merchantGateway.hostId:
    server = require('./lib/roles/gateway')(common, {
      balances: {
        "2": 54000,
        "4": 250
      }
    });
    var setup = server._setup;
    delete server._setup;
    break;
  case common.merchant.hostId:
    server = require('./lib/roles/merchant')(common);
    break;
}

rpc.server(server).listen();
