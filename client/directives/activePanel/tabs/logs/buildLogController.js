'use strict';

require('app')
  .controller('BuildLogController', BuildLogController);
var DEFAULT_ERROR_MESSAGE = '\x1b[33;1mLogs are unavailable at this time\x1b[0m';
/**
 * @ngInject
 */
function BuildLogController(
  keypather,
  dockerStreamCleanser,
  $scope,
  primus,
  promisify,
  streamBuffers,
  through,
  errs,
  $timeout
) {
  $scope.showSpinnerOnStream = true;
  $scope.clearTermOnReconnect = true;

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
            var errorMsg = cbBuild.log || DEFAULT_ERROR_MESSAGE;
            $scope.$emit('WRITE_TO_TERM', errorMsg, true);
          }
        }).catch(errs.handler);
      } else {
        $scope.$emit('STREAM_START', build, true);
      }
    }
  });

  var buffer;
  $scope.streamEnded = function () {
    buffer.destroy();
    $timeout(function () {
      $scope.build.fetch();
    }, 1000);
  };

  $scope.createStream = function () {
    $scope.stream = primus.createBuildStream($scope.build);
  };

  $scope.$on('$destroy', function () {
    if (buffer && buffer.destroy) {
      buffer.destroy();
    }
  });
  $scope.connectStreams = function (terminal) {
    var streamCleanser = dockerStreamCleanser('hex');
    buffer = new streamBuffers.ReadableStreamBuffer({
      frequency: 250,      // in milliseconds.
      chunkSize: 2048     // in bytes.
    });
    buffer.setEncoding('utf8');
    primus.joinStreams(
      $scope.stream,
      streamCleanser
    )
      .pipe(through(
        function write(data) {
          buffer.put(data.toString().replace(/\r?\n/gm, '\r\n'));
        },
        buffer.destroySoon
      ));

    buffer.pipe(terminal);
  };
}



