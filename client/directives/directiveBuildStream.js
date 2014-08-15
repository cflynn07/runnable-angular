require('app')
  .directive('buildStream', buildStream);



/**
 * @ngInject
 */
function buildStream(
  $rootScope,
  jQuery,
  primus
) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      build: '='
    },
    templateUrl: 'viewLogStream',
    link: function ($scope, elem) {

      $scope.stream = {
        finished: false,
        data: ''
      };

      $scope.$watch('build.attrs._id', function (buildId, oldVal) {
        if (buildId) {
          var build = $scope.build;
          if (build.succeeded()) {
            $scope.stream.data = parseReturns($scope.build.attrs.contextVersions[0].build.log);
            $rootScope.safeApply();
          } else if (build.failed()) {
            var contextVersion = build.contextVersions.models[0];
            if (build.contextVersions.models)
              $scope.stream = {
                data: parseReturns(contextVersion.attrs.build.log) ||
                  contextVersion.attrs.build.error.message ||
                  "Unknown Build Error Occurred"
              };
            // check contextVersions.attrs.build.error for unknown errors
            $rootScope.safeApply();
          } else { // build in progress
            initStream();
          }
        }
      });

      function initStream() {
        var build = $scope.build;
        var buildStream = primus.createBuildStream(build);
        var addToStream = function (data) {
          $scope.stream.data += parseReturns(data);
          $rootScope.safeApply();
          jQuery('html, body').scrollTop(10000);
        };
        buildStream.on('data', addToStream);
        buildStream.on('end', function () {
          build.fetch(function (err) {
            if (err) {
              throw err;
            }
            if (build.failed()) {
              // bad things happened
              addToStream('BUILD BROKEN: Please try again');
            } else {
              // we're all good
              addToStream('BUILD SUCCESSFUL');
            }
            $rootScope.safeApply();
          });
        });
      }
    }
  };
}

function parseReturns(data) {
  // Split the data by the \n.
  var splitData= data.split('\n');
  var parsedData= '';
  // Each of the strings in the array may have a \r at the end of them
  splitData.forEach(function (line, index){
    if (line) {
      var firstReturn= line.indexOf('\r');
      if (firstReturn === 0) {
        line = line.slice(1);
      }
      // If the first found return is at the end, or not in it at all, then skip this
      if (firstReturn !== -1 && firstReturn !== line.length - 1) {
        // remove the \r from the end
        var tempLine = line;
        while(tempLine && tempLine.lastIndexOf('\r') === tempLine.length - 1) {
          tempLine = tempLine.slice(0, -1);
        }
        var lastIndex= tempLine.lastIndexOf('\r');
        if (lastIndex > 0) {
          line = line.slice(lastIndex);
        }
      }
      // Since split will cause the last item to be an empty string
      // if the last character was a \n, we add \ns only when this is NOT the
      // last item.  If the last item isn't empty, then it didn't have a \n at
      // the end
      parsedData += line + ((index !== splitData.length -1) ? '\n' : '');
    }
  });
  return parsedData || data;
}
