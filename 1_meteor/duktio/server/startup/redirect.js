Router.map(function () {

	// global redirect to www.dukt.io from all other subdomaina (needed to get google oauth play nice)
  this.route('/(.*)', {
    where: 'server',

    action: function () {
    	var host = this.request.headers.host;
    	if (host && (host.lastIndexOf("www.dukt.io", 0) !== 0)) { 	
    	  this.response.writeHead(301, { Location: 'http://www.dukt.io'});
        this.response.end();
    	} else {
  			this.next();
  		}
    }
  })
});