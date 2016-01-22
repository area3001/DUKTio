var mosca = require('mosca')
var redis = require("redis");


var ascoltatore = {
  type: 'redis',
  redis: require('redis'),
  db: 12,
  port: 6379,
  return_buffers: true, // to handle binary payloads
  host: "localhost"
};

var moscaSettings = {
  port: 11883,
  backend: ascoltatore,
  persistence: {
    factory: mosca.persistence.Redis
  }
};

var server = new mosca.Server(moscaSettings);
server.on('ready', setup);

server.on('clientConnected', function(client) {
    console.log('client connected', client.id);
});

server.on('subscribed', function (topic, client) {
    console.log("Subscribed :=", topic);

    var message = {};
    message.msg = filter_subscribe(topic);

    // message: add routing to the Lua system dukt
    message.routing = {
      "to": 'system.mqtt.in.mqttsubscribe',
    };

    console.log("****TOPIC***");
    console.log(topic);
    console.log("****TOPIC END***");
    console.log(message);
    console.log("****MESSAGE END***");

    // message to JSON
    message = JSON.stringify(message);

    // Send it to redis queue
    var client = redis.createClient();
    client.on("error", function (err) {
      console.log("Error " + err);
    });
    client.rpush("message_list", message);

    // quit, but wait for the redis reply
    client.quit();  // TODO: Check whether client.end() which doesn't wait for the redis reply isn't a better option (higher throughput?)
});

// fired when a message is received
server.on('published', function(packet, client) {
  // packet: { cmd: 'publish', retain: false, qos: 0, dup: false, length: 10, topic: '/hi', payload: <Buffer 74 68 65 72 65> }
  // client: Client { connection: { _readableState: {defaultEncoding: 'utf-8' ...

  var message = {};
  message.msg = filter_publish(packet);

  // message: add routing to the Lua system dukt
  message.routing = {
    "to": 'system.mqtt.in.mqttpublish',
  };

  console.log(message);

  // message to JSON
  message = JSON.stringify(message);

  // Send it to redis queue
  var client = redis.createClient();
  client.on("error", function (err) {
    console.log("Error " + err);
  });
  client.rpush("message_list", message);

  // quit, but wait for the redis reply
  client.quit();  // TODO: Check whether client.end() which doesn't wait for the redis reply isn't a better option (higher throughput?)

});

// http://mcollina.github.io/mosca/docs/lib/server.js.html
server.authorizeForward = function(client, packet, callback) {
  // we never send anything to anyone (except explicit through dukt.io)
  // we know it was send through dukt.io cause the MQTT_DUKT_KEY is the first
  // part of the message

  if (packet.topic.substring(0, 32) == "WAf10c2htTn1FT45jLIInFTQVRb9hF50") {
    // This packet came from within dukt
    // remove the KEY from the topic, and forward the packet
    callback(null, true);  // forward
  }
  else {
    callback(null, false);  // Don't forward
  }
};

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running')
}

function filter_publish(packet_orig) {

// // Filters the Request (of type http.IncomingMessage) object values to be passed into the backend message
// // The following fields are needed:

// // Example for webscript.io:
// // form – A table consisting of form data posted to your script. This field is only present if the request has a Content-Type of multipart/form-data or application/x-www-form-urlencode and the body is successfully parsed as form-encoded.
// // query – A table consisting of query string parameters from the request's URL. For example, the query string ?color=red&number=3 will result in a query table of {color="red", number="3"}.
// // querystring – The raw query string from the URL. Using the previous example, the querystring value would be "color=red&number=3".
// // files – A table consisting of files included in a form post. For each included file, the key is the name of the form's input field, and the value is a table consisting of type (the content-type of the uploaded file), filename (original file name), and content (the raw contents of the file).
// // body – The content of the request, after it's been decoded as needed (e.g. decompressed as specified by a Content-Encoding header).
// // method – The HTTP request method. (E.g., GET, POST, ...)
// // remote_addr – The request's origin IP address.
// // scheme – The URL scheme. (E.g., http or https.)
// // port – The URL's port. (E.g., 80 or 443.)
// // path – The URL's path. (E.g., for the URL http://example.webscript.io/foo/bar, the path is /foo/bar.)
// // headers – A table of the HTTP request headers. Keys are "train-cased," like Content-Type.
// // Note: To support Internet Explorer's cross-domain requests using XDomainRequest, if a request has no Content-Type header, an attempt is still made to parse it as application/x-www-form-urlencode.

  request = {};

//   // parse the request, "true" indicates also parse the querystring
//   var req_parsed = liburl.parse(originalUrl, true)

//   // original url lowercased. Example: 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
//   request['href'] = req_parsed.href;

//   // protocol: The request protocol, lowercased. Example: 'http:'
  request['protocol'] = 'mqtt';

//   // host: The full lowercased host portion of the URL, including port information. Example: 'host.com:8080'
//   request['host'] = req_parsed.host;

//   // auth: The authentication information portion of a URL. Example: 'user:pass'
//   request['auth'] = req_parsed.auth;

//   // hostname: Just the lowercased hostname portion of the host. Example: 'host.com'
//   request['hostname'] = req_parsed.hostname;

//   // port: The port number portion of the host. Example: '8080'
//   request['port'] = req_parsed.port;

//   // path: The path section of the URL, that comes after the host and before the query, including the initial slash if present. Example: '/p/a/t/h'
  var url_pattern = new RegExp('^\/*[a-zA-Z0-9_-]*\/[a-zA-Z0-9_-]*\/(.*)$');
  var subdomainString = url_pattern.exec(packet_orig.topic);
  if(!subdomainString) {
    request['pathname'] = '';
  }
  else {
    request['pathname'] = subdomainString[1];
  };

  // request['topic'] = packet_orig.topic;

//   // search: The 'query string' portion of the URL, including the leading question mark. Example: '?query=string'
  // request['payload'] = packet_orig.payload.toString('utf-8');
  request['search'] = packet_orig.payload.toString('utf-8');

//   // path: Concatenation of pathname and search. Example: '/p/a/t/h?query=string'
  request['path'] = request['pathname'] + '?' + request['search'];

//   // query: Either the 'params' portion of the query string, or a querystring-parsed object. Example: 'query=string' or {'query':'string'}
  try {
    request['query'] = JSON.parse(request['search']);
  }
  catch(err) {
    request['query'] = ""
  }

//   // hash: The 'fragment' portion of the URL including the pound-sign. Example: '#hash'
//   request['hash'] = req_parsed.hash;

//   // Subdomain, TODO: security and optimization
//   var subdomainString = url_pattern.exec(request['hostname']);
//   if(!subdomainString) {
//     request['subdomain'] = '';
//   }
//   else {
//     request['subdomain'] = subdomainString[1];
//   };

  var url_pattern = new RegExp('^\/*([a-zA-Z0-9_-]*)\/.*$');
  var subdomainString = url_pattern.exec(packet_orig.topic);
  if(!subdomainString) {
    request['subdomain'] = '';
  }
  else {
    request['subdomain'] = subdomainString[1];
  };

  // API OR CLIENT KEY
  var url_pattern = new RegExp('^\/*[a-zA-Z0-9_-]*\/([a-zA-Z0-9_-]*)\/.*$');
  var subdomainString = url_pattern.exec(packet_orig.topic);
  if(!subdomainString) {
    request['key'] = '';
  }
  else {
    request['key'] = subdomainString[1];
  };

//   // the ipaddress
//   request['origin_address'] = (request_orig.headers["X-Forwarded-For"] ||
//                                request_orig.headers["x-forwarded-for"] ||
//                                '').split(',')[0] ||  // a list, [1], [2] are proxies
//                                request_orig.client.remoteAddress;

//   request['origin_port'] = request_orig.connection.remotePort;
//   request['connection_origin_port'] = request_orig.connection.remotePort;

//   console.log(request_orig.socket.remoteAddress);

//   // TODO: files
//   request['files'] = null;

//   // TODO: form
//   request['form'] = null;

//   // TODO: body
//   request['body'] = null;

//   // TODO: method
//   request['method'] = request_orig.method;

//   // TODO: remote_addr
//   request['remote_addr'] = null;

//   // TODO: scheme
//   request['scheme'] = null;

//   // TODO: headers
//   request['headers'] = null

  return request;

}

function filter_subscribe(topic) {

  request = {};
  request['protocol'] = 'mqtt';

  // path: The path section of the URL, that comes after the host and before the query, including the initial slash if present. Example: '/p/a/t/h'
  var url_pattern = new RegExp('^\/*[a-zA-Z0-9_-]*\/[a-zA-Z0-9_-]*\/(.*)$');
  var subdomainString = url_pattern.exec(topic);
  if(!subdomainString) {
    request['pathname'] = '';
  }
  else {
    request['pathname'] = subdomainString[1];
  };

  // subdomain
  var url_pattern = new RegExp('^\/*([a-z0-9_-]*)\/.*$');
  var subdomainString = url_pattern.exec(topic);
  if(!subdomainString) {
    request['subdomain'] = '';
  }
  else {
    request['subdomain'] = subdomainString[1];
  };

  // API OR CLIENT KEY
  var url_pattern = new RegExp('^\/*[a-zA-Z0-9_-]*\/([a-zA-Z0-9_-]*)\/.*$');
  var subdomainString = url_pattern.exec(topic);
  if(!subdomainString) {
    request['key'] = '';
  }
  else {
    request['key'] = subdomainString[1];
  };

  return request;

}
