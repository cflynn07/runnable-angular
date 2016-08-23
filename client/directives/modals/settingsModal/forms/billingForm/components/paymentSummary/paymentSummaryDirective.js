'use strict';

require('app').directive('paymentSummary', paymentSummary);

function paymentSummary(
  $q,
  currentOrg,
  fetchPlan,
  loading,
  moment
) {
  return {
    restrict: 'A',
    templateUrl: 'paymentSummaryView',
    scope: {
      showNext: '=',
      isConfirmation: '='
    },
    link: function ($scope) {
      $scope.currentOrg = currentOrg;
      $scope.planMapping = {
        'runnable-starter': 'Starter',
        'runnable-standard': 'Standard',
        'runnable-plus': 'Plus'
      };
      loading('billingForm', true);
      $q.all([
        fetchPlan()
      ])
        .then(function (data) {
          $scope.plan = data[1].next;
        })
        .finally(function () {
          loading('billingForm', false);
        });

      $scope.calculatePlanPrice = function () {
        if (!$scope.plan) {
          return null;
        }
        return $scope.plan.price * $scope.plan.userCount;
      };

      $scope.getTrialEndDate = function () {
        return moment(currentOrg.poppa.attrs.trialEnd).format('MMM Do, YYYY');
      };
    }
  };
}
