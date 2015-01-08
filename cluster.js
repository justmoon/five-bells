var _ = require('lodash');
var child_process = require('child_process');

var hostIds = _.range(0, 5);
var hosts = hostIds.map(function (hostId) {
  return 'localhost:800'+hostId;
})

hosts.forEach(function (hostname) {
  var hostProcess = child_process.spawn(process.execPath, ['contract.js'], {
    env: {
      CODIUS_GROUP: hosts.join(','),
      CODIUS_SELF: hostname,
      PORT: hostname.split(':')[1],
      QUIET: 1
    }
  });

  hostProcess.stdout.pipe(process.stdout);
  hostProcess.stderr.pipe(process.stderr);

  hostProcess.on('close', function (code) {
    console.log(hostname + ' exited with code ' + code);
  });
});
