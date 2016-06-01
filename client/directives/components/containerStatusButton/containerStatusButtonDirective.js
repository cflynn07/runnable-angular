'use strict';

require('app')
  .directive('containerStatusButton', containerStatusButton);
/**
 * @ngInject
 */
function containerStatusButton(
  $rootScope,
  errs,
  keypather,
  promisify
) {
  return {
    restrict: 'A',
    replace: true,
    templateUrl: 'containerStatusButtonView',
    controller: 'ContainerStatusButtonController',
    controllerAs: 'CSBC',
    bindToController: true,
    scope: {
      instance: '='
    },
    link: function ($scope) {
      $scope.matchesMasterInstance = true;
      $scope.$watch('CSBC.instance.configStatusPromise', function (configStatusPromise) {
        if (configStatusPromise) {
          $scope.CSBC.instance.doesMatchMasterPod()
            .then(function (value) {
              $scope.matchesMasterInstance = value;
            });
        }
      });

      $scope.getStatusText = function () {
        if (keypather.get($scope.CSBC, 'instance.isMigrating()')) {
          return 'Migrating';
        }
        var status = keypather.get($scope.CSBC, 'instance.status()');
        var statusMap = {
          starting: 'Starting',
          stopping: 'Stopping',
          building: 'Building',
          stopped: 'Stopped',
          crashed: 'Crashed',
          running: 'Running',
          buildFailed: 'Build Failed',
          neverStarted: ($rootScope.featureFlags.internalDebugging) ? 'Never Started' : 'Build Failed',
          unknown: 'Unknown'
        };
        return statusMap[status] || 'Unknown';
      };

      $scope.getClassForInstance = function () {
        var status = keypather.get($scope.CSBC, 'instance.status()');

        var classes = [];
        if (['running', 'stopped', 'building', 'starting', 'stopping', 'unknown'].includes(status)){
          classes.push('gray');
        } else if (['crashed', 'buildFailed', 'neverStarted'].includes(status)) {
          classes.push('red');
        }

        if (['starting', 'stopping'].includes(status)) {
          classes.push('in');
        }

        if (keypather.get($scope.CSBC, 'instance.isMigrating()')) {
          classes.push('in');
        }
        return classes;
      };
      $scope.isChanging = function () {
        if (keypather.get($scope.CSBC, 'instance.isMigrating()')) {
          return true;
        }

        var status = keypather.get($scope.CSBC, 'instance.status()');
        return ['starting', 'stopping'].includes(status);
      };
    }
  };
}
