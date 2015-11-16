/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 * This is a proxy to assist with debugging.
 * It will also act as a server, in the absence of an endpoint.
 *
 */
/*
 * This file can be used as a replacement of standaloneProxy.js 
 * This module can be used both in debug mode and live mode
 */
var express = require('express');
var request = require('request');
var publicIp = require('public-ip');
var compression = require('compression');
var stubApp = require('./app/stubApp');
var app = express();

//Allow CORS when withCredentials = true in client
//https://github.com/expressjs/cors
var cors = require('cors');
var corsOptions = {
    origin: ['http://localhost:8000', 'http://localhost:9999', 'http://45.55.145.52:8000'],
    credentials: true
};

var stats = {
    bytes_in: 0,
    bytes_out: 0,
    files: []
};


var Handshake = require('folders/src/handshake.js');
var Qs = require('qs');
var mime = require('mime');

var HandshakeService = Handshake.HandshakeService;


var standaloneServer = function (argv, backend) {
    // a single static backend.
    this.backend = backend;
    this.handshakeService();
    this.configureAndStart(argv);

    /*
    this.shareId = ('shareId' in argv) ? argv['shareId'] : 'testshareid';
	
	*/

};

/*
 * 
 * https://github.com/expressjs/compression#filter-1
 * 
 */
function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false;
    }

    // fallback to standard filter function
    return compression.filter(req, res);
};


var logger = function (req, res, next) {
    console.log("Timestamp : " + Date.now() + " " + req.method + " " + req.originalUrl);
    next();

};


standaloneServer.prototype.handshakeService = function () {
    var self = this;
    self.service = new HandshakeService();
    //console.log('service = ', this.service);
    //FIXME: this should be loaded instead of generated
    // self.keypair = Handshake.createKeypair();
    //self.publicKey = Handshake.stringify(self.keypair.publicKey)
    //console.log('>> Server : Public key: ', self.publicKey);
    //console.log('>> Server : Public key: ', self.service.bob.publicKey);
    console.log('>> Server : Handshake service created');

};

/*
 *
 *
 */
standaloneServer.prototype.mountInstance = function (cb,clientUri) {
    var self = this;
	self.clientUri = clientUri;
    if (self.clientUri) {
		
        publicIp.v4(function (err, ip) {

            var host = process.env.HOST == 'remote' ? ip : self.host;
            var port = self.port;
            var uri = self.clientUri + '/mount?instance=' + host + '&port=' + port;
			console.log(uri);
            require('http').get(uri, function (res) {
                var content = '';
                res.on('data', function (d) {
                    content += d.toString();
                });


                res.on('end', function () {
                    self.instanceId = JSON.parse(content).instance_id;
                    var instanceUrl = self.clientUri + '/instance/' + self.instanceId;
                    console.log("Browse files here -->" + instanceUrl);
                    return cb();
                });

                res.on('err', function (err) {

                    return cb(err);
                });


            });


        });


    } else {
        return cb();
    }
};

standaloneServer.prototype.configureAndStart = function (argv) {
    var self = this;
    argv = argv || {};
    var client = argv['client'];
    var port = argv['listen'];
    var host = argv['host'];
    var compress = argv['compress'];
    var mode = argv['mode'];
    var log = argv['log'];
    var serverBootStatus = '';


    if (compress == 'true') {

        // New call to compress content using gzip with default threshhold for 
        // a file to be valid for compression is 1024 bytes
        app.use(compression({
            filter: shouldCompress
        }));
        serverBootStatus += '>> Server : Compression is On \n';
    } else {

        serverBootStatus += '>> Server : Compression is Off \n';
    }

    console.log('using CORS', corsOptions);
    app.use(cors(corsOptions));

    app.use(express.static(__dirname + client));

    if (log == 'true') {

        app.use(logger);

        serverBootStatus += '>> Server : Logging is on \n ';

    } else {

        serverBootStatus += '>> Server : Logging is off \n ';
    }

    if (client) {

        app.use(express.static(require('path').normalize(client)));



    } else {

        app.get('/', function (req, res, next) {
            res.status(301).send("No Client Attached");
        });

    }

    if ('DEBUG' != mode.toUpperCase()) {

        self.routerLive();

        serverBootStatus = '>> Server : Started in LIVE mode \n' + serverBootStatus;

    } else {

        self.routerDebug();
        serverBootStatus = '>> Server : Started in DEBUG mode \n' + serverBootStatus;

    }

    var server = app.listen(port, host, function () {

        self.host = server.address().address;
        self.port = server.address().port;
        serverBootStatus = '>> Server : Listening at http://' + self.host + ":" + self.port + '\n' + serverBootStatus;
        console.log(serverBootStatus);
    });

};


standaloneServer.prototype.updateStats = function (cb) {
    var instanceId = this.instanceId;

    var body = stats;
    var headers = {

        'Content-type': 'application/json'
    };

    var options = {

        uri: self.clientUri + '/instance/' + instanceId + '/update_stats',
        method: 'POST',
        headers: headers,
        json: true,
        body: body
    };

    request(options, function (err, m, q) {
        if (err) {

            console.log("stats not updated");
            console.log(stats);
        } else if (q.success == false) {

            console.log("error" + q.error);
        } else {
            console.log(q);
        }

    });

};

standaloneServer.prototype.routerDebug = function () {
    var self = this,
        stub;
    var backend = self.backend;


    //haipt: replaced this by cors module
    /*

    app.use(function (req, res, next) {
		
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    */

    app.get('/dir/:shareId/*', function (req, res, next) {

        var shareId = req.params.shareId;
        // FIXME : appending of extra slash at end of path should be taken
        // care at backend itself 
        var path = req.params[0] + '/';
        stub = function () {
            backend.ls(path, function (err, data) {


                var stub = data;
                res.status(200).json(stub);
            });
        }
        next();
    });



    app.get('/dir/:shareId', function (req, res, next) {
        var shareId = req.params.shareId;
        var path = '/';

        stub = function () {
            backend.ls(path, function (err, data) {
                if (err) {

                    res.status(500).send({
                        error: err
                    });

                }

                var stub = data;
                res.status(200).json(stub);
            });
        }
        next();
    });


    app.get('/file/:shareId/*', function (req, res, next) {

        var shareId = req.params.shareId;
        // No extra slash at end of path in case of files
        // should be taken care at module itself 
        var path = req.params[0];
        stub = function () {


            backend.cat(path, function (err, result) {

                if (err) {


                    res.status(500).send({
                        error: err
                    });

                } else {
                    stats.bytes_out += parseInt(result.size);
                    stats.files.push({

                        'download': require('path').basename(path),
                        'datetime': Date.now(),
                        'size': result.size
                    });
                    self.updateStats();
                    res.setHeader('X-File-Name', result.name);
                    res.setHeader('X-File-Size', result.size);
                    res.setHeader('Content-Length', result.size);
                    res.setHeader('Content-disposition', 'attachment; filename=' + result.name);
                    res.setHeader('Content-type', mime.lookup(result.name));
                    result.stream.pipe(res);
                }

            });
        }
        next();
    });

    app.post('/signin', function (req, res) {

        var content = '';

        req.on('data', function (data) {
            content += data;
        });

        req.on('end', function () {
            var obj = Qs.parse(content);
            var username = obj.username;
            var password = obj.password;
            var keep = obj.keep;
            res.status(200).json({
                "success": true
            });
        });

    });

    app.options('/manually_upload_file', function (req, res) {

        var shareId = req.query.shareId;
        var fileId = req.query.fileId;
        res.status(200).end();
    });


    app.post('/manually_upload_file', function (req, res) {
        var shareId = req.query.shareId;
        var fileId = req.query.fileId;
        var match = "web everything:web network:" + shareId + "/";
        var path = fileId.substr(match.length, fileId.length);
        var size = parseInt(req.headers['content-length']);


        stub = function () {


            backend.write(path, req, function (err) {

                if (err) {


                    res.status(500).send({
                        error: err
                    });

                } else {
                    stats.bytes_in += size;
                    stats.files.push({

                        'upload': require('path').basename(path),
                        'datetime': Date.now(),
                        'size': size
                    });

                    self.updateStats();

                    res.status(200).json({
                        'success': true
                    });
                }
            })
        }

    });

    app.options('/upload_file', function (req, res) {

        var fileId = req.query.fileId;
        res.status(200).end();
    });


    app.post('/upload_file', function (req, res, next) {
        console.log("got it");

        var fileId = req.query.fileId;
        if (fileId[0] != '/')
            fileId = '/' + fileId;
        var size = parseInt(req.headers['content-length']);

        stub = function () {
            var path = fileId;

            backend.write(path, req, function (err) {

                if (err) {
                    res.status(500).send({
                        error: err
                    });

                } else {
                    stats.bytes_in += size;
                    stats.files.push({

                        'upload': require('path').basename(path),
                        'datetime': Date.now(),
                        'size': size
                    });
                    self.updateStats();
                    res.status(200).json({
                        'success': true
                    });
                }
            })
        }

        next();

    });

    app.post('/clear_file', function (req, res, next) {

        stub = function () {
            var content = '';

            req.on('data', function (data) {
                content += data;
            });

            req.on('end', function () {
                var obj = Qs.parse(content);
                var shareId = obj.shareId;
                var fileId = obj.fileId;

                backend.unlink(fileId, function (err, data) {

                    if (err) {

                        res.status(500).json({
                            "success": false
                        });

                    } else {

                        res.status(200).json({
                            "success": true
                        });
                    }
                });


            });
        }
        next();
    });

    app.post('/set_files', function (req, res, next) {
        //FIXME: Return set_files from backend!
        stub = stubApp.getStubSetFiles();
        next();

    });

    app.get('/stats', function (req, res, next) {

        stub = function () {
            res.status(200).json(stats);
        }
        next();

    });

    app.get('/get_share', function (req, res, next) {

        stub = stubApp.getStubGetShare();
        next();

    });

    app.get('/session', function (req, res, next) {
        stub = stubApp.getStubSession(res);
        next();
    });

    app.get('/session/', function (req, res, next) {
        stub = stubApp.getStubSession(res);
        next();
    });

    app.get('/json', function (req, res, next) {
        stub = stubApp.getStubJson();
        next();

    });

    app.get('/signal_poll', function (req, res, next) {

        stub = stubApp.getStubSignalPoll();
        next();

    });

    app.get('/terms', function (req, res, next) {

        stub = stubApp.getStubDefault();
        next();

    });


    app.use(function (req, res, next) {
        // In case  'backend' is used
        //res.header("Access-Control-Allow-Origin", "*");
        //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");


        if (typeof (stub) == "function") { //send back only when we have response

            stub();
        } else {
            res.status(200).json(stub);
        }
    });
};


standaloneServer.prototype.routerLive = function () {

    var self = this;


    app.use(function (req, res, next) {
        console.log('Time:', Date.now());
        next();
    });



    /*
     * FIXME:implement proper endpoint to 
     *  initiate handshake protocol
     */
    app.get('/handshake', function (req, res) {


        var options = fio.createNode(self.service.bob);

        // sending Bob public key to client
        res.send(options.body);


    });

    //FIXME: quick hack to handle PUT request for handshake
    app.put('/*', function (req, res) {

        var uri = req.path;
        var content = '';

        req.on('data', function (data) {

            content += data.toString();

        });

        req.on('end', function () {

            console.log('parsed content: ', content, typeof (content));
            var endpoint = uri.substring(1);

            if (typeof (content) != 'string') {
                console.log('invalid request!');
                res.writeHead(301);
            }

            content = Handshake.decodeHexString(content);
            //convert public key back to Uint8Array

            var resp = self.service.node(endpoint, content);
            if (resp) {
                console.log('request succeeded!')
                    //response.content = this.publicKey;
                    //response.end(200, this.publicKey);
                res.writeHead(200);
                res.end(self.publicKey);
            } else {
                //conn.status = 301;
                //response.end(301);
                console.log('invalid request!');
                res.writeHead(301);
                res.end();
            }

        });

        return;

    });

    app.post('/*', function (req, res) {

        //check if this is a handshaked session


        var uri = req.path.substring(1);

        console.log('POST', uri);
        rx = /^[0-9a-z]{64}\/(.+)$/;
        var match = rx.exec(uri);

        if (match != null && match.length >= 2) {
            var endpoint = uri.substring(0, 64);
            var path = match[1];
            //console.log('Matched group: ', match[1]);
            var content = '';
            req.on('data', function (data) {

                content += data.toString();

            });
            req.on('end', function () {

                content = JSON.parse(content);

                var signature = content['sign'];
                console.log('content: ', content);
                //test signature

                if (self.service.verifyRequest(endpoint, path, signature)) {
                    res.writeHead(200);
                    res.end(); //OK!
                } else {
                    console.log('invalid signature');
                    response.writeHead(301);
                    response.end();
                }
                //console.log('parsed content: ', content, typeof(content));

            });

            return;
        } else {
            console.log("not our request");
        }


    });

    app.post('/set_files', function (req, res) {

        var content = '';
        req.on('data', function (data) {

            content += data.toString();

        });


        req.on('end', function () {


            var obj = Qs.parse(content);

            if (obj.shareId.length == 0) {

                //As per old java api  
                // FIXME:Create a new share or possibly use 
                // fio.createNode.Not sure

            } else {

                // updating old share as per old java api  	

            }

        });

    });

    /*
  
  
  

  //FIXME: check provider.js again as getCurrentSession is not exported properly
  var currentSession = self.routeHandler.getCurrentSession();
  // currentToken

  // FIXME: Later.
  if(!currentSession) {
    response.end();
    return;
  }


// FIXME: Currently serving one route at the moment when proxying upstream.
  var currentToken = currentSession.token;
  var currentShareName = currentSession.shareName;
  var currentShareId = currentSession.shareId;
 
  
	  
  // NOTES: restHandler will handle requests internally, the subsequent methods simply proxy requests to another server.

  
  var requestId = helpers.uuid();
  var result = restApp(conn, requestId,this.shareId);
  if(result) {
	console.log("sending a data packet through.");
	var streamId = result.data.streamId || result.streamId;
	self.routeHandler.once(streamId, function(stream, headers) {
	console.log("response", streamId, headers);
	// NOTES: Bug in the client, it tries to deserialize twice.
	if(headers) delete headers['Content-Type'];
		response.writeHead(200, headers);
		return stream.pipe(response);

	});

    // Request could be self-served from a provider or from a listening json stream.
	self.routeHandler.send(result);
	return result;

  }
	
  
  if(request.method == "GET") {

	// FIXME: These are still tuned to having one active shareId; the initial point of this proxy.
	// Scope has increased to handling multiple active shareIds.
	// Event stream.
	if(request.url.substr(0,5) == "/json") {
		var listen = {};
		// Listen for events from one ID:
		if(false) {
			eventFriendly(request, response, listen, currentShareId);
			// uses a global, passes to a submodule, broken.
			proxyListRequest = listen.onList;
			proxyBlobRequest = listen.onBlob;
			listen.onClose = function() { proxyListRequest = proxyBlobRequest = null; };
		}
			var shareId = eventFriendly(request, response, listen);
			self.routeHandler.until(shareId, listen);
		}		

		else {
			defaultFriendly(request, response);
		}
		return;
	}
	
	*/
    app.get('/json', function (req, res) {

    });

    app.get('get_share', function (req, res) {

    });

    app.get('/file/:id', function (req, res) {

    });


    app.get('/terms', function (req, res) {

    });


    app.get('/dir/:id', function (req, res) {

    });

    app.get('/press', function (req, res) {

    });

};

var strToArr = function (str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    return new Uint8Array(arr);
}


module.exports = standaloneServer;