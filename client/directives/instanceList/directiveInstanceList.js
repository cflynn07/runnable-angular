'use strict';

require('app')
  .directive('instanceList', instanceList);
/**
 * This directive is in charge of fetching and displaying the instance list for the entire page.
 * The parent gives this the 'instances' pointer, which it populates whenever it see's a change of
 * the active account
 * @ngInject
 */
function instanceList(
  getInstanceClasses,
  getInstanceAltTitle,
  $state
) {
  return {
    restrict: 'A',
    templateUrl: 'viewInstanceList',
    scope: {
      data: '=',
      state: '=',
      actions: '='
    },
    link: function ($scope, elem, attrs) {

      $scope.stateToInstance = function (instance, $event) {
        $event.preventDefault();
        $state.go('instance.instance', {
          instanceName: instance.attrs.name,
          userName: instance.attrs.owner.username
        });
      };

      $scope.getInstanceClasses = getInstanceClasses;

      $scope.getInstanceAltTitle = getInstanceAltTitle;
    }
  };
}
