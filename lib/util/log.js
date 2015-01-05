var rpc = require('codius-rpc');
var chalk = require('chalk');

// Array#find polyfill
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

module.exports = function (common) {
  return function () {
    // Find which node we are
    var nodeInfo = Object.keys(common).map(function (key) {
      return common[key];
    }).find(function (node) {
      if (node.hostId === rpc.hostId) return true;
      else return false;
    });

    // Add the log prefix
    var arguments = Array.prototype.slice.call(arguments);
    if (nodeInfo) {
      arguments[0] = chalk.bold(chalk[nodeInfo.logColor](nodeInfo.logName)) + arguments[0];
    }
    console.log.apply(console, arguments);
  };
};
