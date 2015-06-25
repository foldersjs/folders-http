/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 * "http" is a special provider, as it provides event routing 
 * (via that route.js implementation and the /json endpoint).
 *
 */

// we can also use fio channels to recieve messages 
var route = require('./route');

var FoldersHttp = function (options) {

    var self = this;

    this.provider = options.provider;

    var onReady = function (result) {


        //console.log(result);

    };

    var onMessage = function (message) {


        if (message.type = 'DirectoryListRequest') {

            self.ls(message.data);

        } else if (message.type = 'FileRequest') {

            self.cat(message.data);

        }
		
	var onClose = function(){
		
		//TODO: implement clean up  
		
	}	


    };


    var stream = route.open('', function (result) {

        var session = {};
        session.token = result.token;
        session.shareId = result.shareId;
        self.session = session;

        route.watch('', session, onReady, onMessage);

    });


};



FoldersHttp.prototype.ls = function (data) {

    var self = this,
        headers = {}
    var path = data.path;
    var streamId = data.streamId;
    self.provider.ls(path, function (result) {

		// this is working
        route.post(streamId, JSON.stringify(result), headers, self.session.shareId);


    });


};

FoldersHttp.prototype.cat = function (data) {

    var self = this;
    var path = data.path,
        headers = {};
    var streamId = data.streamId;

    self.provider.cat(path, function (result) {
        headers['Content-Length'] = result.size;
        route.post(streamId, result.stream, headers, self.session.shareId);

    });


};


module.exports = FoldersHttp;