// https://github.com/Worlize/WebSocket-Node/wiki/Documentation

var WebSocketServer = require('websocket').server;

function start(httpServer){
	var wsServer = new WebSocketServer({ httpServer: httpServer });

	wsServer.on('request', onRequest);
	wsServer.on('connect', onConnect);
	wsServer.on('close', onClose);

	setInterval(sendClientsCount, 30000);
}

exports.start = start;

/***********************/

var connections = [];
var connectionsWaiting = [];
var lastConnectionId = 1;

function onRequest(webSocketRequest){
    webSocketRequest.accept(null, webSocketRequest.origin);
}

function onConnect(webSocketConnection){
	console.log("New client - " + (connections.length + 1) + ' clients');

	webSocketConnection['connectionId'] = lastConnectionId++;
	connections.push(webSocketConnection);

	webSocketConnection.on('message', onMessage);

	addConnectionToWaitingList(webSocketConnection);
}

function onClose(webSocketConnection, closeReason, description){
	console.log("Client disconnected - " + (connections.length - 1) + ' clients');

	var partnerConnection = webSocketConnection['partnerConnection'];

	removeConnectionFromArray(connections, webSocketConnection);
	removeConnectionFromArray(connectionsWaiting, webSocketConnection);

	if(partnerConnection){
		partnerConnection['partnerConnection'] = null;
		addConnectionToWaitingList(partnerConnection);
	}
}

/***********************/

function addConnectionToWaitingList(webSocketConnection){
	webSocketConnection.send(JSON.stringify({ type: 'clients_count', count: connections.length }));

	connectionsWaiting.push(webSocketConnection); 

   	if(connectionsWaiting.length < 2){
   		return;
   	}

   	var partnerConnection = connectionsWaiting[0];
    
    webSocketConnection['partnerConnection'] = partnerConnection;
    partnerConnection['partnerConnection'] = webSocketConnection;

    removeConnectionFromArray(connectionsWaiting, webSocketConnection);
    removeConnectionFromArray(connectionsWaiting, partnerConnection);

	webSocketConnection.send(JSON.stringify({ type: 'do_call' }));
}

function onMessage(message){
    try{
    	// Ignore user without partner, when someone disconnected from room
    	if(!this['partnerConnection']){
    		return;
    	}

		// Ignore no utf8 message
		if(message.type != 'utf8'){
			return;
		}

		var data = message.utf8Data;
		var json = JSON.parse(data);

        if(json['type'] == 'offer' || json['type'] == 'answer' || json['type'] == 'candidate'){
        	this['partnerConnection'].send(data);
        }else{
        	console.log("Message type unknown: " + json['type']);
        }
    }catch(e){
    	console.log("Cannot parse data: " + e);
    }
}

function sendClientsCount(){
	for(var i = 0; i < connections.length; ++i){
		connections[i].send(JSON.stringify({ type: 'clients_count', count: connections.length }));
	}
}

/***********************/

function removeConnectionFromArray(array, webSocketConnection){
	for(var i = 0; i < array.length; ++i){
		if(array[i]['connectionId'] == webSocketConnection['connectionId']){
			array.splice(i, 1);
			break;
		}
	}
}
