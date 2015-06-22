/* jshint -W058 */
var d = require('describe-property');
var isBinary = require('bodec').isBinary;
var decodeBase64 = require('./utils/decodeBase64');
var encodeBase64 = require('./utils/encodeBase64');
var stringifyQuery = require('./utils/stringifyQuery');
var Promise = require('./utils/Promise');
var Location = require('./Location');
var Message = require('./Message');

function locationPropertyAlias(name) {
  return d.gs(function () {
    return this.location[name];
  }, function (value) {
    this.location[name] = value;
  });
}

function defaultErrorHandler(error) {
  if (typeof console !== 'undefined' && console.error) {
    console.error((error && error.stack) || error);
  } else {
    throw error; // Don't silently swallow errors!
  }
}

function defaultCloseHandler() {}

function defaultApp(conn) {
  conn.status = 404;
  conn.response.contentType = 'text/plain';
  conn.response.content = 'Not found: ' + conn.method + ' ' + conn.path;
}

/**
 * An HTTP connection that acts as the asynchronous primitive for
 * the duration of the request/response cycle.
 *
 * Important features are:
 *
 * - request        A Message representing the request being made. In
 *                  a server environment, this is an "incoming" message
 *                  that was probably generated by a web browser or some
 *                  other consumer. In a client environment, this is an
 *                  "outgoing" message that we send to a remote server.
 * - response       A Message representing the response to the request.
 *                  In a server environment, this is an "outgoing" message
 *                  that will be sent back to the client. In a client
 *                  environment, this is the response that was received
 *                  from the remote server.
 * - method         The HTTP method that the request uses
 * - location       The URL of the request. In a server environment, this
 *                  is derived from the URL path used in the request as
 *                  well as a combination of the Host, X-Forwarded-* and
 *                  other relevant headers.
 * - version        The version of HTTP used in the request
 * - status         The HTTP status code of the response
 * - statusText     The HTTP status text that corresponds to the status
 * - responseText   This is a special property that contains the entire
 *                  content of the response. It is present by default when
 *                  making client requests for convenience, but may also be
 *                  disabled when you need to stream the response.
 *
 * Options may be any of the following:
 *
 * - content        The request content, defaults to ""
 * - headers        The request headers, defaults to {}
 * - method         The request HTTP method, defaults to "GET"
 * - location/url   The request Location or URL
 * - params         The request params
 * - onError        A function that is called when there is an error
 * - onClose        A function that is called when the request closes
 *
 * The options may also be a URL string to specify the URL.
 */
function Connection(options) {
  options = options || {};

  var location;
  if (typeof options === 'string') {
    location = options; // options may be a URL string.
  } else if (options.location || options.url) {
    location = options.location || options.url;
  } else if (typeof window === 'object') {
    location = window.location.href;
  }

  this.location = location;
  this.version = options.version || '1.1';
  this.method = options.method;

  this.onError = (options.onError || defaultErrorHandler).bind(this);
  this.onClose = (options.onClose || defaultCloseHandler).bind(this);
  this.request = new Message(options.content, options.headers);
  this.response = new Message;

  // Params may be given as an object.
  if (options.params) {
    if (this.method === 'GET' || this.method === 'HEAD') {
      this.query = options.params;
    } else {
      this.request.contentType = 'application/x-www-form-urlencoded';
      this.request.content = stringifyQuery(options.params);
    }
  }

  this.withCredentials = options.withCredentials || false;
  this.remoteHost = options.remoteHost || null;
  this.remoteUser = options.remoteUser || null;
  this.basename = '';

  this.responseText = null;
  this.status = 200;
}

Object.defineProperties(Connection.prototype, {

  /**
   * The method used in the request.
   */
  method: d.gs(function () {
    return this._method;
  }, function (value) {
    this._method = typeof value === 'string' ? value.toUpperCase() : 'GET';
  }),

  /**
   * The Location of the request.
   */
  location: d.gs(function () {
    return this._location;
  }, function (value) {
    this._location = (value instanceof Location) ? value : new Location(value);
  }),

  href: locationPropertyAlias('href'),
  protocol: locationPropertyAlias('protocol'),
  host: locationPropertyAlias('host'),
  hostname: locationPropertyAlias('hostname'),
  port: locationPropertyAlias('port'),
  search: locationPropertyAlias('search'),
  queryString: locationPropertyAlias('queryString'),
  query: locationPropertyAlias('query'),

  /**
   * True if the request uses SSL, false otherwise.
   */
  isSSL: d.gs(function () {
    return this.protocol === 'https:';
  }),

  /**
   * The username:password used in the request, an empty string
   * if no auth was provided.
   */
  auth: d.gs(function () {
    var header = this.request.headers['Authorization'];

    if (header) {
      var parts = header.split(' ', 2);
      var scheme = parts[0];

      if (scheme.toLowerCase() === 'basic')
        return decodeBase64(parts[1]);

      return header;
    }

    return this.location.auth;
  }, function (value) {
    var headers = this.request.headers;

    if (value && typeof value === 'string') {
      headers['Authorization'] = 'Basic ' + encodeBase64(value);
    } else {
      delete headers['Authorization'];
    }
  }),

  /**
   * The portion of the original URL path that is still relevant
   * for request processing.
   */
  pathname: d.gs(function () {
    return this.location.pathname.replace(this.basename, '') || '/';
  }, function (value) {
    this.location.pathname = this.basename + value;
  }),

  /**
   * The URL path with query string.
   */
  path: d.gs(function () {
    return this.pathname + this.search;
  }, function (value) {
    this.location.path = this.basename + value;
  }),

  /**
   * Calls the given `app` with this connection as the only argument.
   * as the first argument and returns a promise for a Response.
   */
  call: d(function (app) {
    app = app || defaultApp;

    var conn = this;

    try {
      return Promise.resolve(app(conn)).then(function (value) {

        if (value == null)
          return;

        if (typeof value === 'number') {
          conn.status = value;
        } else if (typeof value === 'string' || isBinary(value) || typeof value.pipe === 'function') {
          conn.response.content = value;
        } else {
          if (value.headers != null)
            conn.response.headers = value.headers;

          if (value.content != null)
            conn.response.content = value.content;

          if (value.status != null)
            conn.status = value.status;
        }
      });
    } catch (error) {
      return Promise.reject(error);
    }
  })

});

module.exports = Connection;
