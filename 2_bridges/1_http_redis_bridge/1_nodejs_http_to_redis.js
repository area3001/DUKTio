//  Load the http module to create an http server .
// TODO: Check if we can load only when required
var http = require('http');
var querystring = require('querystring');
var redis = require("redis");
var liburl = require('url')
var querystring = require('querystring');  //http://stackoverflow.com/questions/4295782/how-do-you-extract-post-data-in-node-js

var domain = "localhost.com"
var domain_escaped = "dukt\.io"

var server = http.createServer(function (request, response) {

  // stop the favicon request
  if (request.url == "/favicon.ico") return 0;

  // filters the request and writes it to redis afterwards
  filter_request(request, response, write_to_redis);

});

function write_to_redis(message, response) {
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

  // write the response, closing the connection
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end('{status: "ok"}\n');
}

// used to get the POST data from the request
function processPost(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') return null;

    request.on('data', function(data) {
        queryData += data;
        if(queryData.length > 1e6) {
            queryData = "";
            response.writeHead(413, {'Content-Type': 'text/plain'}).end();
            request.connection.destroy();
        }
    });

    request.on('end', function() {
        request.post = querystring.parse(queryData);
        callback(request);
    });
}

function filter_request_get(request_orig) {
  request = {};

  request['method'] = request_orig.method;
  request['post'] = request_orig.post;

  // original url
  var protocol = "http";  // later: via request_orig.socket (http://nodejs.org/api/http.html)
  var originalUrl = protocol + '://' + request_orig.headers.host + request_orig.url;
  console.log(originalUrl);

  // parse the request, "true" indicates also parse the querystring
  var req_parsed = liburl.parse(originalUrl, true)

  // original url lowercased. Example: 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
  request['href'] = req_parsed.href;

  // protocol: The request protocol, lowercased. Example: 'http:'
  request['protocol'] = req_parsed.protocol;

  // host: The full lowercased host portion of the URL, including port information. Example: 'host.com:8080'
  request['host'] = req_parsed.host;

  // auth: The authentication information portion of a URL. Example: 'user:pass'
  request['auth'] = req_parsed.auth;

  // hostname: Just the lowercased hostname portion of the host. Example: 'host.com'
  request['hostname'] = req_parsed.hostname;

  // port: The port number portion of the host. Example: '8080'
  request['port'] = req_parsed.port;

  // path: The path section of the URL, that comes after the host and before the query, including the initial slash if present. Example: '/p/a/t/h'
  // Need to strip out the API KEY
  var url_pattern = new RegExp('^\/*[a-zA-Z0-9_-]*\/([a-zA-Z0-9_-]*)\/*.*$');
  var pathString = url_pattern.exec(req_parsed.pathname);
  if(!pathString) {
    request['pathname'] = '';
  }
  else {
    request['pathname'] = pathString[1];
  };

  // API or CLIENT KEY
  var url_pattern = new RegExp('^\/*([a-zA-Z0-9_-]*)\/.*$');
  var keyString = url_pattern.exec(req_parsed.pathname);
  if(!keyString) {
    request['key'] = '';
  }
  else {
    request['key'] = keyString[1];
  };

  // path: The path section of the URL, that comes after the host and before the query, including the initial slash if present. Example: '/p/a/t/h'
  var url_pattern = new RegExp('^\/*[a-zA-Z0-9_-]*\/([\/a-zA-Z0-9_-]*).*$');
  var full_pathString = url_pattern.exec(req_parsed.pathname);
  if(!full_pathString) {
    full_path = '';
  }
  else {
    full_path = full_pathString[1];
  };

  // search: The 'query string' portion of the URL, including the leading question mark. Example: '?query=string'
  request['search'] = req_parsed.search;

  // path: Concatenation of pathname and search. Example: '/p/a/t/h?query=string'
  request['path'] = full_path + request['search']; // req_parsed.path;

  // query: Either the 'params' portion of the query string, or a querystring-parsed object. Example: 'query=string' or {'query':'string'}
  request['query'] = req_parsed.query;

  // hash: The 'fragment' portion of the URL including the pound-sign. Example: '#hash'
  request['hash'] = req_parsed.hash;

  // Subdomain, TODO: security and optimization
  var url_pattern = new RegExp('^([a-z0-9_-]*)\.' + domain_escaped);
  var subdomainString = url_pattern.exec(request['hostname']);
  if(!subdomainString) {
    request['subdomain'] = '';
  }
  else {
    request['subdomain'] = subdomainString[1];
  };

  // the ipaddress
  request['origin_address'] = (request_orig.headers["X-Forwarded-For"] ||
                               request_orig.headers["x-forwarded-for"] ||
                               '').split(',')[0] ||  // a list, [1], [2] are proxies
                               request_orig.client.remoteAddress;

  request['origin_port'] = request_orig.connection.remotePort;
  request['connection_origin_port'] = request_orig.connection.remotePort;

  console.log(request_orig.socket.remoteAddress);

  // TODO: files
  request['files'] = null;

  // TODO: form
  request['form'] = null;

  // TODO: body
  request['body'] = null;

  // TODO: remote_addr
  request['remote_addr'] = null;

  // TODO: scheme
  request['scheme'] = null;

  // TODO: headers
  request['headers'] = null

  return request;
}

function filter_request(request, response, callback) {
// Filters the Request (of type http.IncomingMessage) object values to be passed into the backend message
// The following fields are needed:

// Example for webscript.io:
// form – A table consisting of form data posted to your script. This field is only present if the request has a Content-Type of multipart/form-data or application/x-www-form-urlencode and the body is successfully parsed as form-encoded.
// query – A table consisting of query string parameters from the request's URL. For example, the query string ?color=red&number=3 will result in a query table of {color="red", number="3"}.
// querystring – The raw query string from the URL. Using the previous example, the querystring value would be "color=red&number=3".
// files – A table consisting of files included in a form post. For each included file, the key is the name of the form's input field, and the value is a table consisting of type (the content-type of the uploaded file), filename (original file name), and content (the raw contents of the file).
// body – The content of the request, after it's been decoded as needed (e.g. decompressed as specified by a Content-Encoding header).
// method – The HTTP request method. (E.g., GET, POST, ...)
// remote_addr – The request's origin IP address.
// scheme – The URL scheme. (E.g., http or https.)
// port – The URL's port. (E.g., 80 or 443.)
// path – The URL's path. (E.g., for the URL http://example.webscript.io/foo/bar, the path is /foo/bar.)
// headers – A table of the HTTP request headers. Keys are "train-cased," like Content-Type.
// Note: To support Internet Explorer's cross-domain requests using XDomainRequest, if a request has no Content-Type header, an attempt is still made to parse it as application/x-www-form-urlencode.

  // the POST data can come in blocks so we work with a callback
  var message = {};
  message.routing = {
    "to": 'system.http.in.httprequest',  // the dukt node this will be routed to
  };
  if(request['method'] == 'POST') {
    processPost(request, response, function(request) {
      message.msg = filter_request_get(request);
      callback(message, response); // callback will write to the DB
    });
  } else {
    message.msg = filter_request_get(request);
    callback(message, response); // callback will write to the DB
  }
}

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(18000);

// // Put a friendly message on the terminal
// console.log("Server running at http://127.0.0.1:8000/");

// fixturesDir = path.join(__dirname, '..', '..', 'test', 'fixtures');
// httpProxy.createServer({
//   target: {
//     host: 'localhost',
//     port: 8000
//   },
//   ssl: {
//     key: fs.readFileSync(path.join(fixturesDir, 'agent2-key.pem'), 'utf8'),
//     cert: fs.readFileSync(path.join(fixturesDir, 'agent2-cert.pem'), 'utf8')
//   }
// }).listen(8443);

// // Proxying https to http server
// console.log("Server running at http://127.0.0.1:8000/");
