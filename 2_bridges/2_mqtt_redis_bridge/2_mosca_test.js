var mosca = require('mosca');

var SECURE_KEY = __dirname + '/ssl.key';
var SECURE_CERT = __dirname + '/ssl.crt';

var ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

var settings = {
  port: 11883,
  logger: {
    name: "secure",
    level: 40
  },
//  secure : {
//   port: 18883,
//    keyPath: SECURE_KEY,
//    certPath: SECURE_CERT
//  },
  backend: ascoltatore,
//  allowNonSecure: true,
  //https: {
  //  port: 18883,
  //  bundle: true,
  //  static: './'
  //}
};

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running');
}

var server = new mosca.Server(settings);
server.on('ready', setup);

server.on('clientConnected', function(client) {
  console.log('client connected', client.id);
});

// fired when a message is received
server.on('published', function(packet, client) {
  console.log('Published', packet.payload);
});
