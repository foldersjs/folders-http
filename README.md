Folders-http
=============

This Folders Module implements file and folders transfer over http protocol for various folders.io synthetic file system.
Module can be installed via "npm install folders-http".


### Installation 


To install 'folders-http' 

Installation (use --save to save to package.json)

```sh
npm install folders-http
```


Basic Usage


### Constructor

Constructor, could pass the special option/param in the config param.

```js

var FoldersHttp = require('folders-http');

//'Folders'  provide the backend 'ftp' , 'local' etc 
var Folders = require('folders');

var ftpConfig = {

    // the connection string, format: ftp//username:password@host:port
    connectionString : "ftp://test:123456@localhost:3333",

    // the option to start up a embedded server when inin the folders, used in test/debug
    enableEmbeddedServer : true     

};

var config = {
  
  // Remote / localhost to provide server services   
  host:'http://folders.io',
  
  provider:Folders.provider('ftp',ftpConfig).create('localhost-ftp'),
  
  cb:function(err){console.log(err)}
  
 
 };

var http = new FoldersHttp(config);

```

## Parameters

1. Config
	1. **host** . Specifies remote or local host at which connection has to be made and route has to be opened
	2. **provider**. Contains reference to  some folders.io synthetic file system
	3. **cb** .Callback which contains err information .Only gets executed if some error happens
	

There are no methods exposed to external world by folders-http since it works on messages received over http 
