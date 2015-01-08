var Promise = require('../../bluebird');
var rpc = require('codius-rpc');

module.exports = function (common, config) {
  var myGateway = rpc.getPeer(common.merchantGateway.hostId);

  Promise.delay(200).then(function (){
    // The payment the sender would like to make
    return Promise.promisify(myGateway.request, myGateway)('subscribe', [{
      subject: rpc.hostId,
      subscriber: rpc.hostId
    }]);
  }).done();

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
