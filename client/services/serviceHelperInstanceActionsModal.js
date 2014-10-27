require('app')
  .factory('helperInstanceActionsModal', HelperInstanceActionsModal);
/**
 * @ngInject
 */
function HelperInstanceActionsModal (
  $rootScope,
  $state,
  $stateParams,
  $timeout
) {
  /**
   * Shared actions-modal logic.
   * Present on instance.instance & instance.instanceEdit
   */
  return function ($scope) {

    var data = {};
    data.instance  = null;
    data.instances = null;

    $scope.$watch('instance', function (n) {
      if (n) data.instance = n;
    });

    $scope.$watch('instances', function (n) {
      if (n) data.instances = n;
    });

    if (!$scope.popoverGearMenu || !$scope.popoverGearMenu.data) {
      throw new Error('helperInstanceActionsModal $scope popoverGearMenu not defined');
    }

    $scope.popoverGearMenu.data.dataModalRename = data;
    $scope.popoverGearMenu.data.dataModalFork   = data;
    $scope.popoverGearMenu.data.dataModalDelete = data;

    $scope.popoverGearMenu.data.actionsModalRename = {
      renameInstance: function (newName, cb) {
        $scope.popoverGearMenu.data.show = false;
        newName = newName.trim();
        if (newName === $scope.instance.attrs.name) {
          return;
        }
        cb = cb || angular.noop;
        // hacky, class remove + add
        $timeout(function () {
          $scope.saving = true;
        }, 1);
        $scope.saving = false;
        $scope.instance.update({
          name: newName
        }, function (err) {
          $rootScope.safeApply();
          if (err) throw err;
          $state.go('instance.instance', {
            userName: $stateParams.userName,
            instanceName: $scope.instance.attrs.name
          });
        });
        cb();
      },
      cancel: function () {
        $scope.popoverGearMenu.data.show = false;
      }
    };

    $scope.popoverGearMenu.data.actionsModalFork = {
      forkInstance: function (newName, env, cb) {
        $scope.popoverGearMenu.data.show = false;
        newName = newName.trim();
        cb = cb || angular.noop;
        // TODO display loading overlay
        var newInstance = $scope.instance.copy(function (err) {
          if (err) throw err;
          var opts = {};
          opts.name = newName;
          if (env) {
            opts.env = env.map(function (e) {
              return e.key + '=' + e.value;
            });
          }
          newInstance.update(opts, function (err) {
            $rootScope.safeApply();
            if (err) throw err;
            $state.go('instance.instance', {
              userName: $stateParams.userName,
              instanceName: newInstance.attrs.name
            });
          });
        });
      },
      cancel: function () {
        $scope.popoverGearMenu.data.show = false;
      }
    };

    $scope.popoverGearMenu.data.actionsModalDelete = {
      deleteInstance: function () {
        data.instance.destroy(function (err) {
          $rootScope.safeApply();
          if (err) throw err;
          // redirect to next instance or new
          if (data.instances.models.length) {
            $state.go('instance.instance', {
              userName: $stateParams.userName,
              instanceName: data.instances.models[0].attrs.name
            });
          } else {
            $state.go('instance.new', {
              userName: $stateParams.userName
            });
          }
        });
      },
      cancel: function () {
        $scope.popoverGearMenu.data.show = false;
      }
    };

  };
}
