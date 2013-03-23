var fileServer = require('./server');
var webSocketServer = require('./webSocketServer');

var httpServer = fileServer.start(8080);
webSocketServer.start(httpServer);
