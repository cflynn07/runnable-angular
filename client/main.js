var app     = require('app');
var angular = require('angular');
var _       = require('underscore');
var jQuery  = require('jquery'); //required: places $ on window

// Cache all views
var views = require('./build/views/viewBundle');
app.run(['$rootScope', '$templateCache', function ($rootScope, $templateCache) {
  _.each(views.Templates, function (item, index) {
    $templateCache.put(index, item());
  });
  // leave user at top of page each route change
  $rootScope.$on('$stateChangeSuccess', function () {
    jQuery('html, body').scrollTop(0);
  });
}]);

require('./controllers/index');
require('./services/index');
require('./filters/index');
require('./directives/index');
require('./animations/index');

require('./router');

window.onload = function () {
  module.exports = angular.bootstrap(document, ['app']);
};