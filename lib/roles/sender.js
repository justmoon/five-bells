var Promise = require('../../bluebird');
var _ = require('lodash');
var rpc = require('codius-rpc');
var chalk = require('chalk');

module.exports = function (common, config) {
  var trader = Promise.promisifyAll(rpc.getPeer(common.trader.hostId));
  var myGateway = Promise.promisifyAll(rpc.getPeer(common.senderGateway.hostId));

  function simulatePayment(payment) {
    var quoteValue;

    return Promise.try(function () {
      common.log("Hi, I'm "+chalk[common.sender.logColor](common.sender.name+", the sender")+".");
      common.log("I want to pay " +
        payment.destination.value + " " +
        payment.destination.currency +
        " to " + chalk[common.merchant.logColor](common.merchant.name+", the merchant")+".");
      common.log("Let's ask " + chalk[common.trader.logColor](common.trader.name+", the trader") +
        " for a quote!");

      return trader.requestAsync('getQuote', [payment]);
    })
    .then(function (msg) {
      quoteValue = msg.result.source.value;

      common.log("Got the quote! It'll cost me " + quoteValue + " " +
        msg.result.source.currency + ". That seems ok.");
      common.log("Now I need to lock the funds at my " +
        chalk[common.senderGateway.logColor]("gateway") + ".");

      // We want the lock to be conditional on the destination transfer happening
      var lockCondition = _.cloneDeep(payment.destination);
      lockCondition.to = lockCondition.owner;
      delete lockCondition.owner;
      lockCondition.type = "PAID";
      lockCondition.signer = payment.destination.issuer;
      lockCondition.signed = true;

      var lockOrder = _.cloneDeep(payment.source);
      lockOrder.value = quoteValue;
      lockOrder.condition = lockCondition;
      lockOrder.signer = rpc.hostId;
      lockOrder.signed = true;
      return myGateway.requestAsync('lockFunds', [lockOrder]);
    })
    .then(function (msg) {
      common.log("Next I'll send the order along with the lock receipt to " +
        chalk[common.trader.logColor](common.trader.name) + ".");

      var paymentOrder = _.cloneDeep(payment);
      paymentOrder.lockReceipt = msg.result;
      return trader.requestAsync('makeTrade', [paymentOrder]);
    });
  }

  return {
    pay: function (request, callback) {
      simulatePayment(request.payment).then(function () {
        callback();
      }).catch(function (error) {
        callback(error);
      });
    }
  };
};
