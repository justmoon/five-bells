var jayson = require('jayson');
var async = require('async');
var _ = require('lodash');

var totalTransactions = 10000;
var simultaneousWorkers = 15;

var client = jayson.client.http({
  hostname: 'localhost',
  port: 8000
});
async.eachLimit(_.range(0, totalTransactions), simultaneousWorkers, function (transactionNo, callback) {
  client.request('pay', [{payment: {
    // Description of the sending account
    source: {
      owner: 0,
      currency: 'USD',
      issuer: 1
    },
    // Description of the receiving account and amount
    destination: {
      owner: 4,
      value: 0.00001,
      currency: 'EUR',
      issuer: 3
    }
  }}], callback);
}, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    console.log('done');
  }
})
