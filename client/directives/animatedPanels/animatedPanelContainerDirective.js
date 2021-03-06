'use strict';

require('app')
  .directive('animatedPanelContainer', animatedPanelContainer);

function animatedPanelContainer(
  $timeout
) {
  return {
    restrict: 'E',
    scope: true,
    transclude: true,
    template: '<div class="animated-panel-container" ng-class="panelClass" ng-style="getAnimatedPanelStyle()"></div>',
    replace: true,
    link: function ($scope, element, attrs, controller, transcludeFn) {
      $scope.$watch('activePanel', function () {
        $scope.$emit('changed-animated-panel', $scope.activePanel);
      });

      $scope.panelClass = 'slide-horizontal';
      if ($scope.animation === 'slideVertical') {
        $scope.panelClass = 'slide-vertical';
      }

      var isAnimatingForwards = true;
      var isAnimatingOut = false;
      var leavingPanel = null;
      var activelyAnimatingTimeout = false;
      var isActivelyAnimating = false;

      var panels = [];
      var panelElements = {};
      $scope.activePanel = null;

      $scope.goToPanel = function (panelName, style) {
        if (panels.includes(panelName)) {
          isActivelyAnimating = style !== 'immediate';
          isAnimatingForwards = style !== 'back';
          isAnimatingOut = false;
          leavingPanel = $scope.activePanel;

          // Quick move our elements to the right spot, then let them animate into place
          $timeout(function () {
            if (style !== 'immediate') {
              isAnimatingOut = true;
              $timeout.cancel(activelyAnimatingTimeout);
              activelyAnimatingTimeout = $timeout(function () {
                isActivelyAnimating = false;
              }, 300);
            }
            $scope.activePanel = panelName;
          }, 0);
        } else {
          isActivelyAnimating = false;
          console.error('Tried going to panel that doesn\'t exist', panelName);
        }
      };

      $scope.$on('go-to-panel', function (evt, panelName, direction) {
        $scope.goToPanel(panelName, direction);
      });

      $scope.registerPanel = function (panelName, panelElement, defaulted) {
        panels.push(panelName);
        panelElements[panelName] = panelElement;
        if (defaulted) {
          $scope.activePanel = panelName;
        }
      };

      $scope.getAnimatedPanelStyle = function () {
        var inElement = panelElements[$scope.activePanel];
        if (!inElement || !isActivelyAnimating) {
          return;
        }
        return {
          height: inElement[0].offsetHeight + 'px',
          width:  inElement[0].offsetWidth + 'px'
        };
      };

      $scope.getPanelClass = function (panelName) {
        var goingForwards = isAnimatingForwards;
        if (leavingPanel === panelName) {
          goingForwards = !goingForwards;
        }

        return {
          out:  panelName !== $scope.activePanel,
          in: panelName === $scope.activePanel,
          back: !goingForwards,
          animated: isAnimatingOut,
          animating: isActivelyAnimating
        };
      };

      transcludeFn($scope, function(clone){
        element.append(clone);
      });
    }
  };
}
