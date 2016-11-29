'use strict';

require('app')
  .controller('ControllerInstance', ControllerInstance);
/**
 * @ngInject
 */
function ControllerInstance(
  $localStorage,
  $q,
  $rootScope,
  $scope,
  $state,
  $stateParams,
  $timeout,
  ahaGuide,
  eventTracking,
  favico,
  fetchCommitData,
  fetchDockerfileForContextVersion,
  fetchInstances,
  fetchSettings,
  fetchUser,
  getCommitForCurrentlyBuildingBuild,
  instancesByPod,
  keypather,
  loading,
  OpenItems,
  pageName,
  setLastInstance
) {
  var CIS = this;
  CIS.isInGuide = ahaGuide.isInGuide;
  var dataInstance = $scope.dataInstance = {
    data: {
      unsavedAcvs: []
    },
    actions: {}
  };
  var data = dataInstance.data;
  $scope.$storage = $localStorage.$default({
     hasSeenHangTightMessage: false,
     hasSeenUrlCallout: false
  });
  console.log('$scope.$storage.hasSeenUrlCallout', $scope.$storage.hasSeenUrlCallout);
  loading('main', true);

  data.openItems = new OpenItems();

  // shows/hides the file menu
  data.showExplorer = true;
  // loader if saving fs changes
  data.saving = false;

  data.userIsOrg = function () {
    return $scope.user.oauthName() !== $state.params.userName;
  };

  // The error handling for fetchUser will re-direct for us, so we don't need to handle that case
  fetchUser().then(function (user) {
    $scope.user = user;
    // product team - track visits to instance page & referrer
    eventTracking.visitedState();
    return $q.all({
      instance: fetchCurrentInstance(),
      settings: fetchSettings()
    })
      .then(function (results) {
        var instance = results.instance;
        // Fetch Dockerfile. Check build didn't fail because there's no Dockerfile
        if (instance.hasDockerfileMirroring() && instance.status() === 'buildFailed' && instance.mirroredDockerfile === undefined) {
          return fetchDockerfileForContextVersion(instance.contextVersion)
            .then(function (dockerfile) {
              instance.mirroredDockerfile = dockerfile;
              return results;
            });
        }
        return results;
      })
      .then(function (results) {
        var instance = results.instance;
        data.instance = instance;

        checkForEnablingHangTightMessage(instance);
        checkForEnablingUrlCallout(instance);
        console.log('controllerInstance', $rootScope.featureFlags.demoMultiTierBuilding && dataInstance.data.showUrlCallout);

        // Check that current commit is not already building
        var currentCommit = keypather.get(instance, 'attrs.contextVersion.appCodeVersions[0].commit');
        getCommitForCurrentlyBuildingBuild(instance)
          .then(function (commit) {
            if (commit && currentCommit !== commit) {
              data.commit = commit;
              data.showUpdatingMessage = true;
            }
          });

        pageName.setTitle(instance.attrs.name);
        data.instance.state = {};

        var goHomeOnDestroyHandler = function () {
          $state.go('base.instances', { userName:  $state.params.userName }, {reload: true});
        };
        instance.on('destroyed', goHomeOnDestroyHandler);
        $scope.$on('$destroy', function () {
          instance.off('destroyed', goHomeOnDestroyHandler);
        });

        data.hasToken = keypather.get(results, 'settings.attrs.notifications.slack.apiToken');
        setLastInstance($stateParams.instanceName);
        loading('main', false);
      })
      .catch(function () {
        // Don't handle the instance fetch err, because it's super annoying
        loading('main', false);
        setLastInstance(false);
        $state.go('base.instances', {
          userName: $stateParams.userName
        }, {reload: true});
      });
  });

  $scope.$watch('dataInstance.data.instance.backgroundContextVersionFinished', function (n, p) {
    // (n !== p) <- Never open this up the first time you arrive on this page
    var unwatchNewCv = angular.noop;
    if (n && n !== p) {
      unwatchNewCv();
      dataInstance.data.instance.backgroundContextVersionFinished = false;
      // If the build was triggered by me manually we don't want to show toasters.
      var isManual = n.triggeredAction.manual;
      var isTriggeredByMe = n.triggeredBy.github === $scope.user.oauthId();

      if (isManual && isTriggeredByMe) {
        data.showUpdatedMessage = false;
        return;
      }
      if (data.instance.contextVersion.getMainAppCodeVersion()) {
        fetchCommitData.activeCommit(
          data.instance.contextVersion.getMainAppCodeVersion(),
          keypather.get(n, 'triggeredAction.appCodeVersion.commit')
        )
          .then(function (commit) {
            data.commit = commit;
            var updateBuildHash = n.hash;
            unwatchNewCv = $scope.$watch(function () {
              return keypather.get($scope, 'dataInstance.data.instance.contextVersion.attrs.build.hash') === updateBuildHash &&
                keypather.get($scope, 'dataInstance.data.instance.containers.models[0].running()');
            }, function (n) {
              if (n) {
                unwatchNewCv();
                data.showUpdatingMessage = false;
                data.showUpdatedMessage = true;
              }
            });
          });
      }
    }
  });

  $scope.$watch('dataInstance.data.instance.backgroundContextVersionBuilding', function (n, p) {
    if (n && n !== p) {
      dataInstance.data.instance.backgroundContextVersionBuilding = false;
      // If the build was triggered by me manually we don't want to show toasters.
      var isManual = n.triggeredAction.manual;
      var isTriggeredByMe = n.triggeredBy.github === $scope.user.oauthId();

      if (isManual && isTriggeredByMe) {
        data.showUpdatingMessage = false;
        return;
      }
      if (data.instance.contextVersion.getMainAppCodeVersion()) {
        fetchCommitData.activeCommit(
          data.instance.contextVersion.getMainAppCodeVersion(),
          keypather.get(n, 'triggeredAction.appCodeVersion.commit')
        )
          .then(function (commit) {
            data.commit = commit;
            data.showUpdatedMessage = false;
            data.showUpdatingMessage = true;
          });
      }
    }
  });

  $scope.$watch('dataInstance.data.instance.status()', function (status) {
    if (!status || keypather.get($scope, 'dataInstance.data.instance.isMigrating()')) {
      // If we're migrating, don't change the tabs
      return;
    }
    switch (status) {
      case 'running':
        data.openItems.restoreTabs(
          { instanceId: data.instance.id() },
          data.instance.containers.models[0],
          true
        );
        if (keypather.get($scope, 'dataInstance.data.instance.attrs.isTesting')) {
          data.openItems.removeAllButLogs();
        }
        break;
      case 'crashed':
      case 'stopped':
      case 'starting':
      case 'stopping':
        data.openItems.removeAllButLogs();
        break;
      default:
        data.openItems.removeAllButBuildLogs();
        break;
    }
    if (!isBuildingOrStarting(status) && data.showHangTightMessage) {
      data.showHangTightMessage = false;
    }
    checkForEnablingUrlCallout(keypather.get($scope, 'dataInstance.data.instance'));
    $timeout(function () {
      favico.setInstanceState(keypather.get($scope, 'dataInstance.data.instance'));
    });
  });

  function checkForEnablingHangTightMessage (instance) {
    // Only show message if user hasn't:
    // 1. Seen message before
    if ($scope.$storage.hasSeenHangTightMessage) { return; }
    // 2. Is looking at a repo instance
    if (!keypather.get(instance, 'contextVersion.getMainAppCodeVersion()')) { return; }
    // 3. Container is currently building or starting
    if (!isBuildingOrStarting(instance.status())) { return; }
    $scope.$storage.hasSeenHangTightMessage = instance.id();
    data.showHangTightMessage = true;
  }

  function checkForEnablingUrlCallout (instance) {
    if (
      !data.showHangTightMessage &&
      instance.status() === 'running' &&
      $scope.$storage.hasSeenHangTightMessage === keypather.get(instance, 'id()') &&
      !$scope.$storage.hasSeenUrlCallout
    ) {
      // Now that we showed the 'hang tight' message, show the URL callout
      data.showUrlCallout = true;
      console.log('set showUrlCallout');
    }
  }

  $scope.$on('dismissUrlCallout', function () {
    if (keypather.get(data, 'showUrlCallout')) {
      data.showUrlCallout = false;
      $scope.$storage.hasSeenUrlCallout = true;
    }
  });

  if (ahaGuide.isInGuide()) {
    if (keypather.get(instancesByPod, 'models.length')) {
      if (instancesByPod.models.some(function (instance) {
          return instance.attrs.hasAddedBranches || keypather.get(instance, 'children.models.length');
        })) {
        // timeout for the animation
        $timeout(function () {
          $rootScope.$broadcast('ahaGuide::launchModal');
        });
      }
    }
  }

  function fetchCurrentInstance () {
    return fetchInstances({ name: $stateParams.instanceName }, true);
  }

  function isBuildingOrStarting (status) {
    return ['building', 'starting'].indexOf(status) !== -1;
  }

}
