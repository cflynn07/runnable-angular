'use strict';

require('app')
  .directive('stackSelectorForm', stackSelectorForm);
/**
 * @ngInject
 */
function stackSelectorForm(
  keypather,
  updateDockerfileFromState
) {
  return {
    restrict: 'A',
    templateUrl: 'viewFormStack',
    scope: {
      state: '=',
      data: '='
    },
    link: function ($scope, elem, attrs) {
      $scope.temp = {
        stack: keypather.get($scope, 'state.selectedStack')
      };
      $scope.updateDockerfile = function () {
        return updateDockerfileFromState($scope.state);
      };
      $scope.updateDockerfileOnNewStack = function () {
        return updateDockerfileFromState($scope.state, true);
      };

      // Since we are adding info to the stack object, and those objects are going to get reused,
      // we should listen to the model changes, and copy the result
      $scope.$watch('temp.stack', function (stack) {
        if (stack) {
          $scope.state.selectedStack = angular.copy(stack);
        }
      });
    }
  };
}
