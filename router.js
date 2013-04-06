var fs = require('fs');

function route(request, response){
	console.log("\n" + request.method + ' "' + request.url + '" for ' + request.connection.remoteAddress);

	findFile(request.url, response);
}

exports.route = route;

/***********************/

function findFile(path, response){
	if(path == '' || path == '/'){
		path = '/index.html';
	}

	var filePath = process.cwd() + '/public' + path;
	fs.exists(filePath, function(exists){
		if(exists){
			renderFile(path, response, filePath);
		}else{
			error404(path, response);
		}
	});
}

function renderFile(path, response, filePath){
	fs.readFile(filePath, function (error, data){
		if(error){
			error500(path, response, "cannot read file '" + path + "'");
		}else{
			console.log('Completed 200 OK');

			response.writeHeader(200);  

			if(filePath.match(/\.(html|htm)$/)){
				response.writeHeader(200, {'Content-Type': 'text/html'});
			}else if(filePath.match(/\.css$/)){
				response.writeHeader(200, {'Content-Type': 'text/css'});
			}else if(filePath.match(/\.js$/)){
				response.writeHeader(200, {'Content-Type': 'application/x-javascript'});
			}

			response.write(data, "binary");  
			response.end();
		}
	});
}

function error404(path, response){
	console.log("Error 404 Not found");

	response.writeHeader(404, {"Content-Type": "text/plain"});
	response.end();
}

function error500(path, response, error){
	console.log("Error 500 Internal error - " + error);

	response.writeHeader(500, {"Content-Type": "text/plain"});
	response.end();
}
