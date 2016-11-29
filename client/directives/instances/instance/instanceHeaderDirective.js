'use strict';

require('app')
  .directive('instanceHeader', instanceHeader);

/**
 * @ngInject
 */
function instanceHeader(
  $localStorage,
  $stateParams,
  ahaGuide,
  fetchPullRequest,
  keypather
) {
  return {
    restrict: 'A',
    templateUrl: 'instanceHeaderView',
    scope: {
      instance: '=',
      openItems: '=',
      instanceData: '=?'
    },
    link: function ($scope) {
      $scope.$storage = $localStorage;
      $scope.userName = $stateParams.userName;
      window.wowScope = $scope;
      $scope.$watch('instance', function (newValue) {
        if (!newValue) {
          return;
        }
        fetchPullRequest($scope.instance)
          .then(function (pr) {
            if (pr) {
              $scope.pr = pr;
            }
          });
      });
      $scope.isInGuide = ahaGuide.isInGuide;
    }
  };
}
