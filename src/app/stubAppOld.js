/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 * This is a proxy to assist with debugging.
 * It forwards requests for basic API services to a remote endpoint.
 * It will also act as a server, in the absence of an endpoint.
 *
 */

// mach uses promises.
var Promise = require('../mach/utils/Promise');

var fs = require('fs');

/*
* Global Variables 
*
*/

/*
 *
 * FIXME: This may be more appropriate in the test folder.
 *
 */
module.exports = function(uri, backend) {
      
    var uri = uri || '/' ;
    console.log(">> Requested URI", uri);
    var stubShare = {};
    var response  = {};

    uri = uri.split('/',3);
    if(uri.length > 2) uri = "/" + uri[1] + "/";
    else uri = "/" + uri[1];
	
	

// Core API:
     if(uri === "/dir/") {
	if(backend) stubShare = function(cb) {
		backend.ls('.', cb);
	};
	else stubShare =[{
            "name":"local",
            "fullPath":"/local",
            "meta":{},
            "uri":"#/http_folders.io_0:union/local",
            "size":0,
            "extension":"+folder",
            "type":""
          },
	  {
            "name":"text.txt",
            "fullPath":"/test.txt",
            "meta":{},
            "uri":"#/http_folders.io_0:union/test.txt",
            "size":100,
            "extension":"txt",
            "type":"text/plain"
	  }
	]
    }
    else if(uri ==='/file/'){
	if(backend)
	return function() {
		return new Promise(function(done, fail) {
			backend.cat("stub-file.txt", function(result, err) {
				if(err) return fail(err);
				var headers = {};
				headers['X-File-Name'] = result.name;
				headers['X-File-Size'] = result.size;
				headers['Content-Length'] = result.size;
				var response = {
					headers: headers,
					content: result.stream,
					status: 200
				};
				done(response);
			});
		});
	};
        stubShare ={
          "file":"Test File Output"
        };
    }


    else if(uri === "/set_files") {
    // Test Stub
        stubShare ={
          "shareId":"testshareid",
          "success":true,
          "shareName":"testShare"
        }
    }
      else if (uri === '/get_share'){
    // test Stub
	stubShare = {"canUploadFiles":false,"shareId":"ddcb096a-2e02-4173-aece-6bed27cb01fa","passwordRestricted":false,"shareGateway":"0","success":true,"shareName":"GyB4Nd"};

	// Extended set: static fileTree; client defined shareId/shareName.
	if(0)
        stubShare = {
          "gateway_id":"0",
          "isProtected":false,
          "success":true,
          "onlyEmptyDirs":false,
          "fileTree":[{
          "d":false,
          "s":74098,
          "c":null,
          "fi":1,
          "p":"",
          "n":"image1.jpg",
          "o":false,
          "l":"2015-02-12T13:08:06.000Z",
          "dbid":"90cf2ce2-4238-43a3-a161-589c3bae7f38"}],
          "online":true,
          "uploadPermission":false,
          "allowOfflineStorage":"true"
        }
    }
    else if(uri === "/set_upload_permission") {
      //Test Stub
        stubShare = {"success":true} ;
    }
    else if(uri === "/session") {
        stubShare = "{}";
    }
    else if(uri === "/json" || uri === "/signal_poll") {
        //eventFriendly(request, response);
        stubShare = {"success":true,"signals":[{"data":{},"type":"KeepAlive"}]}
    }
    else {
        // FIXME: Just a Placeholder 
        stubShare = {"insert":"here"};
    }

    
    //send a stub response testshare      
   var result = function(stubShare) {
	   if (!response.content)
      response.content = JSON.stringify(stubShare);
      response.headers = {'Content-Type':'application/json'};
      response.status  = 200;
      return response;
    };

    // wrap callback as promise.
    if(typeof(stubShare) == "function") {
	return function() {
	return new Promise(function(done, fail) {
		stubShare(function(data, err) {
			if(err) fail(err);
			else done(result(data));
		});
	});
	};
    }
 
    return function() { return result(stubShare); }; 
  
};






  
    

 



