'use strict';

require('app')
  .directive('setupConfirmButton', function setupConfirmButton() {
    return {
      restrict: 'A',
      link: function ($scope, elem, attrs) {

        $scope.$on('updateStep', updateStepHandler);
        updateStepHandler(null, 1);

        function updateStepHandler (event, newStep) {
          $scope.step = newStep;
          if ($scope.step < 3) {
            $scope.buttonText = 'Next';
          } else if ($scope.step === 3) {
            $scope.buttonText = 'Start Build';
          } else if ($scope.step >= 4) {
            $scope.buttonText = 'Create container';
          }
        }

      }
     };
  });