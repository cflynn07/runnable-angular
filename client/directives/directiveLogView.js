var Terminal = require('term.js');
var streamCleanser = require('docker-stream-cleanser');
require('app')
  .directive('logView', logView);
/**
 * @ngInject
 */
function logView(
  $rootScope,
  $filter,
  $timeout,
  jQuery,
  $sce,
  primus
) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      container: '=',
      build: '='
    },
    templateUrl: 'viewLogView',
    link: function ($scope, elem, attrs) {

      var terminal = new Terminal({
        cols: 80,
        rows: 24,
        useStyle: true,
        screenKeys: true
      });
      terminal.open(elem[0]);

      $scope.stream = {
        data: ''
      };
      function writeToTerm (data) {
        data = data.replace(/\r?\n/g, '\r\n');
        terminal.write(data);
      }

      if (attrs.build) {
        $scope.$watch('build.attrs._id', function (buildId, oldVal) {
          if (!buildId) {
            return;
          }
          var build = $scope.build;
          if (build.succeeded()) {
            build.contextVersions.models[0].fetch(function (err, data) {
              if (err) {
                throw err;
              }
              writeToTerm(data.build.log);
            });
          } else if (build.failed()) {
            var contextVersion = build.contextVersions.models[0];
            if (contextVersion && contextVersion.attrs.build) {
              var data = contextVersion.attrs.build.log ||
                (contextVersion.attrs.build.error && contextVersion.attrs.build.error.message) ||
                'Unknown Build Error Occurred';
              writeToTerm(data);
            } else {
              writeToTerm('Unknown Build Error Occurred');
            }
          } else { // build in progress
            initBuildStream();
          }
        });
        var initBuildStream = function () {
          var build = $scope.build;
          var buildStream = primus.createBuildStream($scope.build);
          streamCleanser.cleanStreams(buildStream, terminal);
          buildStream.on('end', function () {
            build.fetch(function (err) {
              if (err) {
                throw err;
              }
              if (!build.succeeded()) {
                // bad things happened
                writeToTerm('BUILD BROKEN: Please try again');
              } else {
                // we're all good
                writeToTerm('Build completed, starting instance...');
              }
            });
          });
        };

      } else if (attrs.container) {
        var initBoxStream = function () {
          var boxStream = primus.createLogStream($scope.container);
          streamCleanser.cleanStreams(boxStream, terminal);

        };
        $scope.$watch('container.attrs._id', function (containerId) {
          if (containerId) {
            initBoxStream();
          }
        });
      } else {
        throw new Error('improper use of directiveLogView');
      }

    }
  };
}
