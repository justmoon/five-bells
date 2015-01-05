var rpc = require('codius-rpc');

module.exports = function (common, config) {
  var myGateway = rpc.getPeer(common.merchantGateway.hostId);

  // As a merchant, I want to know about updates to my account
  myGateway.request('subscribe', [{
    subject: rpc.hostId,
    subscriber: rpc.hostId
  }], function () {});

  return {
    notify: function (request, callback) {
      if (request.type === 'PAID' &&
          request.to === rpc.hostId &&
          request.currency === 'EUR' &&
          request.issuer === common.merchantGateway.hostId &&
          request.signer === common.merchantGateway.hostId &&
          request.signed) {
        common.log("I got paid "+request.value+" "+request.currency+"! Now shipping Alpaca socks.");
      }

      callback();
    }
  };
};
