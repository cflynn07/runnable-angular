var BaseCollection = require('runnable/lib/collections/base');
var BaseModel = require('runnable/lib/models/base');
var VersionFileModel = require('runnable/lib/models/context/version/file');
var ContainerFileModel = require('runnable/lib/models/instance/container/file');
var util = require('util');

require('app')
  .factory('OpenItems', openItemsFactory);
/**
 * @ngInject
 */
function openItemsFactory(
  $localStorage,
  keypather,
  pluck,
  equals,
  async
) {

  function instanceOfModel (model) {
    return (model instanceof VersionFileModel ||
      model instanceof ContainerFileModel ||
      model instanceof Terminal ||
      model instanceof WebView ||
      model instanceof LogView ||
      model instanceof BuildStream);
  }

  function newModel(modelOrAttrs, opts) {
    throw new Error('you are doing it wrong');
  }

  var i = 1;

  // TODO split out
  function Terminal(data) {
    this.collections = [];
    this.attrs = data || {};
    this.attrs._id = i++;
    return this;
  }

  function WebView(data) {
    this.collections = [];
    this.attrs = data || {};
    this.attrs._id = i++;
    return this;
  }

  function BuildStream(data) {
    this.collections = [];
    this.attrs = data || {};
    this.attrs._id = i++;
    return this;
  }

  function LogView(data) {
    this.collections = [];
    this.attrs = data || {};
    this.attrs._id = i++;
    return this;
  }

  util.inherits(Terminal, BaseModel);
  util.inherits(WebView, BaseModel);
  util.inherits(BuildStream, BaseModel);
  util.inherits(LogView, BaseModel);

  var tabTypes = {
    Terminal: Terminal,
    WebView: WebView,
    BuildStream: BuildStream,
    LogView: LogView,
    File: VersionFileModel
  };

  function ActiveHistory(models) {
    BaseCollection.call(this, models, {
      noStore: true
    });
  }

  util.inherits(ActiveHistory, BaseCollection);

  ActiveHistory.prototype.instanceOfModel = instanceOfModel;

  ActiveHistory.prototype.newModel = newModel;

  ActiveHistory.prototype.add = function (model) {
    if (Array.isArray(model)) {
      model.forEach(this.add.bind(this));
      return;
    }
    if (this.last()) {
      this.last().state.active = false;
    }
    model.state.active = true;
    if (!this.contains(model)) {
      BaseCollection.prototype.add.call(this, model);
    } else {
      this.remove(model);
      this.add(model);
    }
    return this;
  };

  ActiveHistory.prototype.remove = function (model) {
    if (this.contains(model)) {
      BaseCollection.prototype.remove.apply(this, arguments);
      if (model.state.active) {
        model.state.active = false;
        if (this.last()) {
          this.last().state.active = true;
        }
      }
    }
  };

  function OpenItems(shortHash) {
    this.shortHash = shortHash;
    this.activeHistory = new ActiveHistory();

    var models = $localStorage[shortHash];
    if (models && models.length) {
      this.fromCache = true;
      models = models.map(function (model) {
        var from = keypather.get(model, 'state.from');
        if (tabTypes[from]) {
          model = new tabTypes[model.state.from](model, { noStore: true });
        }
        return model;
      });
    }
    BaseCollection.call(this, models, {
      noStore: true
    });
  }

  util.inherits(OpenItems, BaseCollection);

  OpenItems.prototype.addWebView = function (data) {
    var webView = new WebView(data);
    this.add(webView);
    return webView;
  };

  OpenItems.prototype.addTerminal = function (data) {
    var terminal = new Terminal(data);
    this.add(terminal);
    return terminal;
  };

  OpenItems.prototype.addBuildStream = function (data) {
    var buildStream = new BuildStream(data);
    this.add(buildStream);
    return buildStream;
  };

  OpenItems.prototype.addLogs = function (data) {
    var logView = new LogView(data);
    this.add(logView);
    return logView;
  };

  OpenItems.prototype.Model = true;

  OpenItems.prototype.instanceOfModel = instanceOfModel;

  OpenItems.prototype.isFile = function (model) {
    return (model instanceof VersionFileModel ||
      model instanceof ContainerFileModel);
  };

  OpenItems.prototype.newModel = newModel;

  OpenItems.prototype.add = function (model) {
    var self = this;
    if (Array.isArray(model)) {
      model.forEach(function (model) {
        self.addOne(model);
      });
      return;
    }
    this.addOne(model);
    this.saveState();
  };

  OpenItems.prototype.addOne = function (model) {
    if (!this.instanceOfModel(model)) {
      throw new Error('Trying to add a non-model');
    }
    model.state = model.state || {
      reset: function () {
        model.state.body = model.attrs.body;
      }
    };
    if (model instanceof Terminal) {
      model.state.type = 'Terminal';
    } else if (model instanceof WebView) {
      model.state.type = 'WebView';
    } else if (model instanceof BuildStream) {
      model.state.type = 'BuildStream';
    } else if (model instanceof LogView) {
      model.state.type = 'LogView';
    } else {
      keypather.set(model, 'state.type', 'File');
      model.state.reset = function () {
        model.state.body = model.attrs.body;
      };
    }
    model.state.open = true;
    model.state.reset();
    this.activeHistory.add(model);
    BaseCollection.prototype.add.apply(this, arguments);
    return this;
  };

  OpenItems.prototype.isClean = function () {
    var models = this.models;
    for (var i = 0; i < models.length; i++) {
      if (models[i].state.type === 'File' &&
        models[i].state.body !== models[i].attrs.body) {
        return false;
      }
    }
    return true;
  };

  OpenItems.prototype.remove = function (model) {
    model.state.open = false;
    if (this.contains(model)) {
      BaseCollection.prototype.remove.call(this, model);
    }
    this.activeHistory.remove(model);
    this.saveState();
    return this;
  };

  OpenItems.prototype.removeAllButLogs = function () {
    var models = this.models.slice();
    for (var i = 0; i < models.length; i++) {
      if (!(models[i] instanceof LogView)) {
        this.remove(models[i]);
      }
    }
  };

  OpenItems.prototype.toJSON = function () {
    var json = [];
    this.models.forEach(function (model) {
      var modelJSON = model.toJSON();
      // The following brought to you by IE not supporting Function.prototype.name
      var modelConstructor = model.constructor.toString().match(/function\s(\w*)/)[1];
      keypather.set(modelJSON, 'state.from', modelConstructor);
      json.push(modelJSON);
    });
    return json;
  };

  OpenItems.prototype.saveState = function () {
    $localStorage[this.shortHash] = this.toJSON();
  };

  return OpenItems;

}
