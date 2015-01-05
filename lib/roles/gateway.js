var _ = require('underscore');
var rpc = require('codius-rpc');
var assert = require('assert');
var events = require('events');

module.exports = function (common, config) {
  var locks = {}, nextLockId = 0,
      eventBus = new events.EventEmitter();
  return {
    subscribe: function (request, callback) {
      eventBus.on('notify:'+request.subject, function (event) {
        var subscriber = rpc.getPeer(request.subscriber);
        subscriber.request('notify', [event], function (err) {
          if (err) console.error('Notification failed', err);
        });
      })
    },
    lockFunds: function (request, callback) {
      common.log("Account #"+request.owner+" wants to lock "+
        request.value+" "+request.currency+".");

      // First, check if there are sufficient funds
      var balance = config.balances[request.owner];
      if (balance < request.value) {
        callback(new Error('Insufficient funds'));
      }

      // Check signature
      assert(request.signer === request.owner);
      assert(request.signed);

      var lockId = nextLockId++;

      // Next, remove the funds from the account
      config.balances[request.owner] -= request.value;
      locks[lockId] = request.value;

      common.log("Ok, the funds are locked in lock #"+lockId+"!");
      // Return locking receipt
      var receipt = {
        type: "LOCKED",
        id: lockId,
        owner: request.owner,
        value: request.value,
        currency: request.currency,
        issuer: request.issuer,
        condition: request.condition,
        signer: rpc.hostId,
        signed: true
      };
      eventBus.emit('notify:'+request.owner, receipt);
      callback(null, receipt);
    },
    transferFunds: function (request, callback) {
      common.log("Account #"+request.from+" wants to transfer "+
        request.value+" "+request.currency+" to #"+request.to);

      // First, check if there are sufficient funds
      var balance = config.balances[request.owner];
      if (balance < request.value) {
        callback(new Error('Insufficient funds'));
      }

      if (request.lockReceipt) {
        // Is the lock valid?
        assert(locks[request.lockReceipt.id] >= request.value);
        assert(request.lockReceipt.owner === request.from);
        assert(request.lockReceipt.currency === request.currency);
        assert(request.lockReceipt.issuer === request.issuer);
        assert(request.lockReceipt.signer === rpc.hostId);
        assert(request.lockReceipt.signed);

        // Is the lock condition fulfilled?
        var lockConditionVerifier = _.matches(request.lockReceipt.condition);
        assert(lockConditionVerifier(request.lockFulfillment));

        common.log("Transfer is authorized via lock #"+request.lockReceipt.id);

        // Transfer funds as requested from the locked funds
        locks[request.lockId] -= request.value;
        config.balances[request.to] += request.value;

        // Send any remainder back to the source
        config.balances[request.from] += locks[request.lockId];
        delete locks[request.lockId];
      } else if (request.signed && request.signer === request.from) {
        common.log("Transfer is authorized via signature.");
        config.balances[request.from] -= request.value;
        config.balances[request.to] += request.value;
      } else {
        throw new Error("Unauthorized transfer");
      }

      common.log("Ok, the funds are transferred!");
      var receipt = {
        type: "PAID",
        from: request.from,
        to: request.to,
        value: request.value,
        currency: request.currency,
        issuer: request.issuer,
        signer: rpc.hostId,
        signed: true
      };
      eventBus.emit('notify:'+request.from, receipt);
      eventBus.emit('notify:'+request.to, receipt);
      callback(null, receipt);
    }
  };
};
