'use strict';

var app = require('app');
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
 * DOM-ready event, start app
 */
angular.element(document).ready(function() {
  angular.bootstrap(document, ['app']);
});
