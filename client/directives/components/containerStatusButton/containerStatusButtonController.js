'use strict';

require('app')
  .controller('ContainerStatusButtonController', ContainerStatusButtonController);
/**
 * @ngInject
 */
function ContainerStatusButtonController(
  $q,
  $rootScope,
  $scope,
  $state,
  currentOrg,
  errs,
  keypather,
  loading,
  promisify,
  redeployClusterMasterInstance,
  updateInstanceWithNewAcvData,
  updateInstanceWithNewBuild
) {
  var CSBC = this;
  CSBC.currentOrg = currentOrg;
  CSBC.doesMatchMasterPod = function () {
    if (!CSBC.instance.doesMatchMasterPod().isFulfilled()) {
      CSBC.instance.doesMatchMasterPod()
        .then(function () {
          $scope.$applyAsync(angular.noop);
        });
      return true;
    }
    return CSBC.instance.doesMatchMasterPod().value();
  };

  function modInstance(action, opts) {
    $rootScope.$broadcast('close-popovers');
    return promisify(CSBC.instance, action)(
      opts
    )
      .catch(errs.handler);
  }

  CSBC.isTesting = function () {
    return keypather.get(CSBC, 'instance.getRepoName()') &&
      (
        keypather.get(CSBC, 'instance.isolation.groupMaster.attrs.isTesting') ||
        keypather.get(CSBC, 'instance.attrs.isTesting'
      )
    );
  };

  CSBC.actions = {
    stopInstance: function () {
      modInstance('stop');
    },
    startInstance: function () {
      modInstance('start');
    },
    restartInstance: function () {
      modInstance('restart');
    },
    redeployCluster: function () {
      $rootScope.$broadcast('close-popovers');
      loading('main', true);
      var instance = CSBC.instance;
      var instanceId = keypather.get(instance, 'attrs.id');
      return redeployClusterMasterInstance(instanceId)
        .catch(errs.handler)
        .finally(function () {
          loading('main', false);
          return $state.go('base.instances.instance', {
            instanceName: $state.params.instanceName,
            userName: $state.params.userName
          });
        });
    },
    rebuildWithoutCache: function () {
      $rootScope.$broadcast('close-popovers');
      loading('main', true);
      var instance = CSBC.instance;
      return $q.when()
        .then(function () {
          if (keypather.get(CSBC, 'instance.containerHistory')) {
            return deployOldCommit();
          }
          if (keypather.get(CSBC, 'instance.isolation.groupMaster.attrs.isTesting')) {
            instance = keypather.get(CSBC, 'instance.isolation.groupMaster');
          }
          return promisify(instance.build, 'deepCopy')()
            .then(function (build) {
              return updateInstanceWithNewBuild(
                instance,
                build,
                true
              );
            });
        })
        .catch(errs.handler)
        .finally(function () {
          loading('main', false);
          if (instance.containerHistory) {
            return $state.go('base.instances.instance', {
              instanceName: $state.params.instanceName,
              userName: $state.params.userName
            });
          }
        });
    },
    updateConfigToMatchMaster: function () {
      // This function makes a copy the master's cv and build, then applies them to this instance
      // This basically updates everything to match with Master
      $rootScope.$broadcast('close-popovers');
      loading('main', true);
      var instanceUpdates = {};
      promisify(CSBC.instance, 'fetchMasterPod', true)()
        .then(function (masterPodInstances) {
          var masterPodInstance = masterPodInstances.models[0];
          instanceUpdates.masterPodInstance = masterPodInstance;
          instanceUpdates.opts = {
            env: masterPodInstance.attrs.env
          };
          return promisify(instanceUpdates.masterPodInstance.build, 'deepCopy')();
        })
        .then(function (build) {
          instanceUpdates.build = build;
          instanceUpdates.contextVersion = build.contextVersions.models[0];
          return promisify(instanceUpdates.contextVersion, 'fetch')();
        })
        .then(function () {
          var currentAcv = CSBC.instance.contextVersion.getMainAppCodeVersion();
          var parentAcv = CSBC.instance.contextVersion.getMainAppCodeVersion();
          if (!currentAcv || !parentAcv) {
            return;
          }
          // Delete the transformRules, since we don't want to update what Master had (erasing the update)
          delete currentAcv.attrs.transformRules;
          return promisify(
            instanceUpdates.contextVersion.getMainAppCodeVersion(),
            'update'
          )(currentAcv.attrs);
        })
        .then(function () {
          return updateInstanceWithNewBuild(
            CSBC.instance,
            instanceUpdates.build,
            true,
            instanceUpdates.opts
          );
        })
        .catch(errs.handler)
        .finally(function () {
          loading('main', false);
        });
    }
  };

  function deployOldCommit () {
    var acv = CSBC.instance.contextVersion.appCodeVersions.models[0];
    return updateInstanceWithNewAcvData(CSBC.instance, acv, {
      branch: CSBC.instance.branch,
      commit: {
        attrs: {
          sha: CSBC.instance.containerHistory.commitSha
        }
      }
    });
  }
}
