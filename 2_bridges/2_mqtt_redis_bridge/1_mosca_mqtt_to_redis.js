var mosca = require('mosca')
var redis = require("redis");

var nop = function() {};

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
    console.log("-> subscribed");
    console.log("   topic" + topic);

    var message = {};
    message.msg = filter_subscribe(topic);

    // message: add routing to the Lua system dukt
    message.routing = {
      "to": 'system.mqtt.in.mqttsubscribe',
    };

    // message to JSON
    message = JSON.stringify(message);
    console.log(message);

    // Send it to redis queue
    var client = redis.createClient();
    client.on("error", function (err) {
      console.log("Error " + err);
    });
    client.rpush("message_list", message);

    // quit, but wait for the redis reply
    client.quit();  // TODO: Check whether client.end() which doesn't wait for the redis reply isn't a better option (higher throughput?)
    console.log("<- subscribed");
});

function clean_topic(topic) {
  // returns a clean topic, e.g. strip the dukt API key out of the topic
  var index = topic.lastIndexOf("WAf10c2htTn1FT45jLIInFTQVRb9hF5");
  console.log(index);
  if (index >= 0) {
    // This packet came from within dukt
    // remove the KEY from the topic, and forward the packet
    topic = topic.substring(0, index) + topic.substring(index + 32);
    console.log(topic);
    console.log("Clean_topic: from dukt, topic stripped");
  };
  return topic;
}

// // published is overwritten
// // to clean the topic when it is published from within dukt
// server.published = function(packet, client, cb) {
//   console.log("-> published");
//   var cleaned_topic = clean_topic(packet.topic);
//   if (packet.topic === cleaned_topic) {
//     // not stripped, hence not from within dukt
//     // don't further alter the packet here
//     return cb();
//   }
//   else {
//     // from within dukt
//     // we need to strip the topic
//     var newPacket = {
//       topic: cleaned_topic,
//       payload: packet.payload,
//       retain: packet.retain,
//       qos: packet.qos,
//       dukt_origin: true
//     };
//
//     console.log("Published: republishing as:")
//     console.log(newPacket);
//     server.publish(newPacket, cb);
//   }
//   console.log("<- published");
// }

// fired when a message is received
server.on('published', function(packet, client) {
  // packet: { cmd: 'publish', retain: false, qos: 0, dup: false, length: 10, topic: '/hi', payload: <Buffer 74 68 65 72 65> }
  // client: Client { connection: { _readableState: {defaultEncoding: 'utf-8' ...
  console.log("-> on published");
  console.log(packet);

  var message = {};
  message.msg = filter_publish(packet);

  // message: add routing to the Lua system dukt
  message.routing = {
    "to": 'system.mqtt.in.mqttpublish',
  };

  // message to JSON
  message = JSON.stringify(message);
  console.log(message);

  // Send it to redis queue
  var client = redis.createClient();
  client.on("error", function (err) {
    console.log("Error " + err);
  });
  client.rpush("message_list", message);

  // quit, but wait for the redis reply
  client.quit();  // TODO: Check whether client.end() which doesn't wait for the redis reply isn't a better option (higher throughput?)
  console.log("<- on published");

});

// http://mcollina.github.io/mosca/docs/lib/server.js.html
server.authorizeForward = function(client, packet, callback) {
  // we never send anything to anyone (except explicit through dukt.io)
  // we know it was send through dukt.io cause the MQTT_DUKT_KEY is the first
  // part of the message
  console.log("-> authorizeForward");
  // client.subscriptions == { '#': { qos: 0, handler: [Function] },
  //   topic1: { qos: 0, handler: [Function] },
  //   topic2: { qos: 0, handler: [Function] } }

  if (packet.dukt_origin) {
    console.log("   forwarding");
    callback(null, true);
  }
  else {
    console.log("   not forwarding");
    callback(null, false);
  }
  console.log("<- authorizeForward");
};

// overwriten since we do not allow subscribes for wildcard in the first
// two levels of the topic hierarchy, i.e. a/b/# is ok, but not a/# or #.
// also disallow the $SYS topics
server.authorizeSubscribe = function(client, topic, callback) {
  topic_split = topic.split("/");
  if (topic_split[0] === "#" ||
      topic_split[0] === "+" ||
      topic_split[0] === "$SYS" ||
      topic_split[1] === "#" ||
      topic_split[1] === "+") {
        console.log("subscribe " + topic + " not authorized")
        callback(null, false);
      }
  else {
    callback(null, true);
  };
};

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running');
//   server.authenticate = authenticate;
//   server.authorizePublish = authorizePublish;
//   server.authorizeSubscribe = authorizeSubscribe;
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


///////////
// OVERWRITTEN TO CHANGE THE MOSCA IMPLEMENTATION
///////////

/**
 * Publishes a packet on the MQTT broker.
 *
 * @api public
 * @param {Object} packet The MQTT packet, it should include the
 *                        topic, payload, qos, and retain keys.
 * @param {Object} client The client object (internal)
 * @param {Function} callback The callback
 */
server.publish = function publish(packet, client, callback) {

  console.log("in publish !!!");
  console.log(packet);
  var that = this;
  var logger = this.logger;

  if (typeof client === 'function') {
    callback = client;
    client = null;
  } else if (client) {
    logger = client.logger;
  }

  if (!callback) {
    callback = nop;
  }

  // PAVE: remove the dukt API key
  // and set the origin from inside dukt or not
  var cleaned_topic = clean_topic(packet.topic);
  var dukt_origin = false;
  if (cleaned_topic !== packet.topic) {
    // from within dukt
    dukt_origin = true;
  }

  var newPacket = {
    topic: cleaned_topic,
    payload: packet.payload,
    messageId: this.generateUniqueId(),
    qos: packet.qos,
    retain: packet.retain
  };

  var opts = {
    qos: packet.qos,
    messageId: newPacket.messageId,
    dukt_origin: dukt_origin
  };

  if (client) {
    opts.clientId = client.id;
  }

  that.storePacket(newPacket, function() {

    if (that.closed) {
      logger.debug({ packet: newPacket }, "not delivering because we are closed");
      return;
    }

    that.ascoltatore.publish(
      newPacket.topic,
      newPacket.payload,
      opts,
      function() {
        that.published(newPacket, client, function() {
          if( newPacket.topic.indexOf( '$SYS' ) >= 0 ) {
            logger.trace({ packet: newPacket }, "published packet");
          } else {
            logger.debug({ packet: newPacket }, "published packet");
          }
          that.emit("published", newPacket, client);
          callback();
        });
      }
    );
  });
};
