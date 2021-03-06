'use strict';

require('app').directive('planStatusForm', planStatusForm);

function planStatusForm(
  billingPlans,
  keypather
) {
  return {
    restrict: 'A',
    templateUrl: 'planStatusForm',
    controller: 'PlanStatusFormController as PSFC',
    link: function ($scope) {
      /**
       * Get the classes for the meter
       * @returns {Object} - Object with keys of class names and true/false for if they should be enabled
       */
      $scope.getMeterClass = function () {
        var classes = {};
        if ($scope.PSFC.configurations) {
          classes['used-' + Math.min($scope.PSFC.configurations, 15)] = true;
        }
        if (keypather.get($scope, 'preview.length')) {
          classes['preview-used-' + billingPlans[$scope.preview].maxConfigurations] = true;
        }
        return classes;
      };
    }
  };
}
