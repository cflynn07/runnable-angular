var Runnable = require('runnable');

require('app')
  .factory('user', function ($http, configAPIHost) {
    var runnable = new Runnable(configAPIHost);

    runnable.client.request = new AngularHttpRequest($http);

    return runnable;
  });

var methods = ['get', 'post', 'patch', 'delete'];
var bodyMethods = ['post', 'patch', 'delete'];

var AngularHttpRequest = function AngularHttpRequest ($http) {
  this.$http = $http;
};

AngularHttpRequest.prototype.defaults = function () {

};

methods.forEach(function (method) {
  AngularHttpRequest.prototype[method] = function () {
    var args = (~bodyMethods.indexOf(method)) ?
      this._formatBodyArgs(arguments):
      this._formatQueryArgs(arguments);

    var opts = args.opts;
    var cb   = args.cb;
    opts.method = method;
    opts.data = opts.json || opts.body;
    delete opts.json;
    delete opts.body;
    opts.params = opts.qs;
    delete opts.qs;

    this.$http(opts)
      .success(callback)
      .error(callback);

    function callback (data, status, headers, config) {
      var body = data;
      var res = {
        body: body,
        statusCode: status,
        headers: headers
      };
      cb(null, res, body);
    }
  };
});

AngularHttpRequest.prototype._formatArgs = function (args) {
  var url  = args[0];
  var opts = args[1];
  var cb   = args[2];

  if (angular.isFunction(url)) {
    cb = url;
    opts = null;
    url = null;
  }
  else if (angular.isObject(url)) {
    cb = opts;
    opts = url;
    url = null;
  }
  else if (angular.isFunction(opts)) {
    cb = opts;
    opts = null;
  }
  else {}

  opts = angular.extend(opts || {}, this.defaultOpts);
  opts.url = opts.url || opts.uri;

  return {
    url: url,
    opts: opts,
    cb: cb
  };
};

AngularHttpRequest.prototype._formatBodyArgs = function (args) {
  args = this._formatArgs(args);
  if (args.url) {
    // assume opts is body if doesnt look like opts
    if (!args.opts.url || !args.opts.json || !args.opts.query) {
      args.opts = { json: args.opts };
    }
  }
  args.opts.url = args.url;
  return args;
};


AngularHttpRequest.prototype._formatQueryArgs = function (args) {
  args = this._formatArgs(args);
  if (args.url) {
    // assume opts is body if doesnt look like opts
    if (!args.opts.url || !args.opts.json || !args.opts.query) {
      args.opts = { qs: args.opts };
    }
  }
  args.opts.url = args.url;
  return args;
};

