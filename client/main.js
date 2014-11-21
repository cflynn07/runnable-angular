var app = require('app');
var $ = require('jquery');
require('angular');

/**
 * each 'index' generated via grunt process
 * dynamically includes all browserify common-js
 * modules in js bundle
 */
require('./polyfills/index');
require('./controllers/index');
require('./services/index');
require('./filters/index');
require('./directives/index');
require('./decorators/index');
require('./animations/index');
require('./lib/router');

/**
 * bundle of all templates to be attached to $templateCache
 * generated by grunt process
 */
var views = require('./build/views/viewBundle');

/**
 * Decorator, CORS setting
 * to pass authentication cookie
 * w/ HTTP requests
 */
app.config(function ($httpProvider) {
  $httpProvider.defaults.withCredentials = true;
});

/**
 * SafeApply mechanism for invoking
 * $digest loop safely within async
 * function callback
 */
app.run(['$rootScope',
  '$timeout',
  function ($rootScope,
    $timeout) {
    var applyCallbacks = [];
    $rootScope.safeApply = function (cb) {
      if (cb) {
        applyCallbacks.push(cb);
      }
      $timeout(function () {
        $rootScope.$apply();
        applyCallbacks.forEach(function (cb) {
          cb();
        });
        applyCallbacks = [];
      });
    };
  }
]);

/**
 * Pre-load template cache with compiled
 * jade templates included in JS bundle
 */
app.run(['$rootScope',
  '$templateCache',
  function ($rootScope,
    $templateCache) {
    Object.keys(views.Templates).forEach(function (viewName) {
      $templateCache.put(viewName, views.Templates[viewName]());
    });
  }
]);

/**
 * Broadcast to all child scops when keydown key is escape
 */
app.run([
  '$rootScope',
  function ($rootScope) {
    $(document).on('keydown', function (e) {
      if (e.keyCode === 27) {
        $rootScope.$broadcast('app-document-click');
        $rootScope.safeApply();
      }
    });
  }
]);

/**
 * DOM-ready event, start app
 */
angular.element(document).ready(function() {
  angular.bootstrap(document, ['app']);
});
