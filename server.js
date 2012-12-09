function renderFile(request,response){
	var my_path = url.parse(request.url).pathname;

	if(my_path == "" || my_path == "/"){
		my_path = "/index.html";
	}

	var full_path = path.join(process.cwd(), '/server', my_path);
	filesys.exists(full_path, function(exists){
		if(!exists){
			response.writeHeader(404, {"Content-Type": "text/plain"});  
			response.end();
		}
		else{
			filesys.readFile(full_path, "binary", function(err, file) {  
			     if(err) {  
			         response.writeHeader(500, {"Content-Type": "text/plain"});  
			         response.write(err + "\n");  
			         response.end();
			     }  
				 else{
					response.writeHeader(200);  
			        response.write(file, "binary");  
			        response.end();
				}
			});
		}
	});
}

function removeClient(client_id, array){
	for(var i = 0; i < array.length; ++i){
		if(array[i]['id'] == client_id){
			array.splice(i, 1);
			return;
		}
	}
}

function matchUser(client, users_waiting){
    client['partner'] = null;

    if(users_waiting.length > 1){
    	var partner = users_waiting[0];

    	client['partner'] = partner;
    	partner['partner'] = client;

    	removeClient(client['id'], users_waiting);
    	removeClient(partner['id'], users_waiting);

    	client['connection'].send(JSON.stringify({'type': 'do_call'}));
    }
}

//Require for websocket server
var WebSocketServer = require('websocket').server;
var http = require('http');


//Require for static serve file
var path = require("path");
var url = require("url");
var filesys = require("fs");


var last_client_id = 0;
var users = new Array();
var users_waiting = new Array();

var server = http.createServer(renderFile);
server.listen(8080);

console.log("Listenning on port 8080");

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
	// console.log("New client");

    var connection = request.accept(null, request.origin);

    var client = {'id': last_client_id, 'connection': connection, 'partner': null};
    users.push(client); 
    users_waiting.push(client); 
    last_client_id += 1;

    function sendState(){
        client['connection'].send(JSON.stringify({'type': 'client_count', 'value': users.length}));
        setTimeout(sendState, 15000);
    }

    sendState();
    matchUser(client, users_waiting);

    connection.on('message', function(message) {
    	try{
    		if(!client['partner']){
    			return;
    		}

	        if (message.type === 'utf8') {

	            data = message.utf8Data;
	            json = JSON.parse(data);

           		if(json['type'] == 'offer' || json['type'] == 'answer' || json['type'] == 'candidate'){
           			client['partner']['connection'].send(data);
                }else{
           			console.log("Message type unknown: " + json['type']);
           		}
	        }
    	}catch(e){
    		console.log("Cannot parse data: " + e.meesage);
    	}
    });

    connection.on('close', function(connection) {
    	// console.log("Client disconnected");

    	if(client['partner']){
    		users_waiting.push(client['partner']); 
    		client['partner']['connection'].send(JSON.stringify({'type': 'wait'}));
    		matchUser(client['partner'], users_waiting);
    	}

		removeClient(client['id'], users_waiting);
    	removeClient(client['id'], users);
    });
});