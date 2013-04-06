var httpServer = require('./httpServer');
var webSocketServer = require('./webSocketServer');

var httpServer = httpServer.start(process.env.PORT || 3000);
webSocketServer.start(httpServer);
