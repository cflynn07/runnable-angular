'use strict';

require('app')
  .controller('BuildLogController', BuildLogController);
var DEFAULT_ERROR_MESSAGE = '\x1b[33;1mbuild failed\x1b[0m';
var DEFAULT_INVALID_BUILD_MESSAGE = '\x1b[31;1mPlease build again\x1b[0m';
var COMPLETE_SUCCESS_MESSAGE = 'Build completed, starting instance...';
/**
 * @ngInject
 */
function BuildLogController(
  keypather,
  dockerStreamCleanser,
  $scope,
  primus,
  $log,
  promisify,
  errs
) {
  $scope.showSpinnerOnStream = true;

  $scope.$watch('build.attrs.id', function (n) {
    if (n) {
      var build = $scope.build;
      if (build.failed() || build.succeeded()) {
        promisify(build.contextVersions.models[0], 'fetch')().then(function (data) {
          var cbBuild = keypather.get(data, 'attrs.build');
          if (build.succeeded()) {
            $scope.$emit('WRITE_TO_TERM', cbBuild.log, true);
          } else {
            // defaulting behavior selects best avail error msg
            var errorMsg = cbBuild.log + '\n' + (keypather.get(cbBuild, 'error.message') || DEFAULT_ERROR_MESSAGE);
            $scope.$emit('WRITE_TO_TERM', errorMsg, true);
          }
        }).catch(errs.handler);
      } else {
        $scope.$emit('STREAM_START', build, true);
      }
    }
  });

  $scope.createStream = function () {
    $scope.stream = primus.createBuildStream($scope.build);
  };

  $scope.connectStreams = function (terminal) {
    dockerStreamCleanser.cleanStreams($scope.stream,
      terminal,
      'hex',
      true);
  };

  $scope.streamEnded = function () {
    promisify($scope.build, 'fetch')().then(function (build) {
      //$timeout(angular.noop);
      if (!build.succeeded()) {
        $scope.$emit('WRITE_TO_TERM', DEFAULT_INVALID_BUILD_MESSAGE);
      } else {
        $scope.$emit('WRITE_TO_TERM', COMPLETE_SUCCESS_MESSAGE);
      }
    }).catch(function (err) {
      $log.error(err);
    });
  };

}



