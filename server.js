var http = require('http');
var router = require('./router');

function start(port){
	var server = http.createServer(router.route);
	
	server.on("listening", function(){
		console.log("Listening on port " + port);
	});

	server.listen(port);
	return server;
}

exports.start = start;
