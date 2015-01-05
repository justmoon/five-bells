var _ = require('lodash');
var assert = require('assert');
var rpc = require('codius-rpc');

module.exports = function (common, config) {
  function calculateTrade(payment) {
    var pair = [
      payment.source.currency+'/'+payment.source.issuer,
      payment.destination.currency+'/'+payment.destination.issuer,
    ];

    var rate = config.rates[pair.join(':')];

    if (payment.source.value) {
      common.log('Calculating quote for converting ' +
        payment.source.value + " " + payment.source.currency +
        " to " +
        payment.destination.currency);

      payment.destination.value = payment.source.value / rate;
    } else if (payment.destination.value) {
      common.log('Calculating quote for converting ' +
        payment.source.currency +
        " to " +
        payment.destination.value + " " + payment.destination.currency);

      payment.source.value = payment.destination.value * rate;
    } else {
      throw new Error('No offers available for this pair.');
    }
  }

  return {
    getQuote: function (request, callback) {
      var response = _.cloneDeep(request);
      calculateTrade(response);
      callback(null, response);
    },
    makeTrade: function (request, callback) {
      common.log("Someone wants to trade to get "+request.destination.value+" "+
        request.destination.currency+", awesome!");

      var quote = _.cloneDeep(request);
      calculateTrade(quote);

      assert(request.lockReceipt.type === "LOCKED");
      assert(request.lockReceipt.value >= quote.source.value);
      assert(request.lockReceipt.currency === quote.source.currency);
      assert(request.lockReceipt.owner === quote.source.owner);
      assert(request.lockReceipt.issuer === quote.source.issuer);
      assert(request.lockReceipt.signer === quote.source.issuer);
      assert(request.lockReceipt.signed);
      common.log("The lock receipt looks ok to me. Let's make the payment.");

      var sourceGateway = rpc.getPeer(quote.source.issuer);
      var destinationGateway = rpc.getPeer(quote.destination.issuer);
      destinationGateway.request("transferFunds", [{
        from: rpc.hostId,
        to: quote.destination.owner,
        value: quote.destination.value,
        currency: quote.destination.currency,
        issuer: quote.destination.issuer,
        signer: rpc.hostId,
        signed: true
      }], function (error, msg) {
        common.log("Transfer completed! Now I want to get paid!");

        sourceGateway.request("transferFunds", [{
          from: quote.source.owner,
          to: rpc.hostId,
          value: quote.source.value,
          currency: quote.source.currency,
          issuer: quote.source.issuer,
          lockReceipt: request.lockReceipt,
          lockFulfillment: msg.result
        }], function (error, msg) {
          callback(null, {});
        });
      });
    }
  };
};
