
'use strict';

require('app')
  .controller('AhaGuideController', AhaGuideController);

function AhaGuideController(
  $rootScope,
  $scope,
  ahaGuide,
  currentOrg,
  errs,
  fetchInstancesByPod,
  keypather
) {
  var AGC = this;
  var animatedPanelListener = angular.noop;

  if (keypather.has(currentOrg, 'poppa.attrs.id') && ahaGuide.isAddingFirstRepo() && AGC.subStepIndex > 6) {
    fetchInstancesByPod()
      .then(function (instances) {
        if (instances.models.length) {
          var config = checkContainerInstances(instances);
          if (!config.workingRepoInstance) {
            AGC.showError = true;
            AGC.errorState = 'nonRunningContainer';
            updateCaption('exitedEarly');
            $rootScope.$broadcast('ahaGuideEvent', {
              error: AGC.errorState
            });
          } else if (ahaGuide.isAddingFirstRepo()) {
            if (AGC.subStepIndex === 7) {
              callPopover(config, instances);
              updateCaption('success');
            }
          }
        } else {
          ahaGuide.furthestSubstep(ahaGuide.steps.ADD_FIRST_REPO, 'addRepository');
        }
      })
      .catch(errs.handler);
  }

  $scope.$on('alert', function (event, alert) {
    // alerts on container creation success
    if (alert.text === 'Container Created' && alert.type === 'success') {
      if (!AGC.errorState) {
        updateCaption('logs');
      }
      registerListeners();
      fetchInstancesByPod()
        .then(function (instances) {
          var config = checkContainerInstances(instances);
          if (config) {
            callPopover(config, instances);
          }
        })
        .catch(errs.handler);
    }
  });

  if (ahaGuide.isAddingFirstRepo() && (AGC.subStepIndex >= 6 || AGC.subStepIndex === 0)) {
    registerListeners();
  }

  var stopTabUpdate = $scope.$on('updatedTab', function (event, tabName) {
    if (AGC.subStepIndex > 5) {
      stopTabUpdate();
    } else {
      updateCaption(tabName);
    }
  });

  AGC.ahaGuide = ahaGuide;
  AGC.configSteps = ahaGuide.stepList[ahaGuide.steps.ADD_FIRST_REPO].configSubsteps;
  AGC.errorState = $scope.errorState;
  AGC.hasConfirmedSetup = ahaGuide.hasConfirmedSetup;
  AGC.isBuildSuccessful = false;
  AGC.isInGuide = ahaGuide.isInGuide;
  AGC.skipBranchMilestone = ahaGuide.skipBranchMilestone;
  AGC.getClassForSubstep = getClassForSubstep;

  // get the current milestone
  var currentMilestone = ahaGuide.stepList[ahaGuide.getCurrentStep()];

  AGC.title = currentMilestone.title;
  updateCaption(AGC.subStep);

  // update steps and initiate digest loop
  function updateCaption(status) {
    if (!currentMilestone.subSteps[status]) {
      return;
    }
    if (status === 'dockLoaded') {
      animatedPanelListener();
    }
    AGC.subStep = status;
    AGC.className = currentMilestone.subSteps[status].className;
    AGC.subStepIndex = currentMilestone.subSteps[status].step;
    ahaGuide.furthestSubstep(ahaGuide.steps.ADD_FIRST_REPO, status);
  }

  function registerListeners () {
    $scope.$on('buildStatusUpdated', function (event, buildStatus) {
      if (ahaGuide.isAddingFirstRepo()) {
        handleBuildUpdate(buildStatus);
      }
    });

    $scope.$on('ahaGuideEvent', function (event, info) {
      if (info.error === 'exitedEarly') {
        AGC.showError = true;
        AGC.errorState = info.error;
        updateCaption('exitedEarly');
      } else if (info.error === 'nonRunningContainer') {
        AGC.showError = true;
        AGC.errorState = info.error;
      } else if (info.error === 'buildFailed') {
        AGC.showError = true;
        AGC.errorState = info.error;
      } else if (info.isClear) {
        AGC.showError = false;
        AGC.errorState = null;
      }
    });
  }

  function handleBuildUpdate (update) {
    var buildStatus = update.status;
    if (buildStatus === 'buildFailed' || buildStatus === 'stopped' || buildStatus === 'crashed') {
      AGC.showError = true;
      AGC.errorState = 'nonRunningContainer';
      $rootScope.$broadcast('ahaGuideEvent', {
        error: 'buildFailed'
      });
    } else if (buildStatus === 'starting') {
      AGC.showError = false;
      // as long as the build was successful that's ok
      $rootScope.$broadcast('ahaGuideEvent', {
        isClear: true
      });
      AGC.isBuildSuccessful = true;
    } else if (buildStatus === 'running') {
      updateCaption('success');
    }
    AGC.buildStatus = buildStatus;
    AGC.caption = currentMilestone.buildStatus[buildStatus] || AGC.caption;
  }
 /** this checks all instances and whether there is a built repo instance and non repo instance
  * @param {object} instances an object containing a collection of instances
  * @return {object} config an object with two boolean properties, nonRepoInstance and workingRepoInstance
  */
  function checkContainerInstances (instances) {
    if (!instances) {
      return null;
    }
    var config = {};
    var status;
    var repoName;
    instances.forEach(function(instance) {
      status = instance.status();
      repoName = instance.getRepoName();
      if (repoName && status !== 'building' && status !== 'buildFailed') {
        config.workingRepoInstance = true;
      } else if (!repoName) {
        config.nonRepoInstance = true;
      }
    });
    return config;
  }

  /** this only calls popovers for one specific group. they have built a repo and nonrepo instance only.
   * @param {object} config an object with two boolean properties, nonRepoInstance and workingRepoInstance
   * @param {object} instances an object containing a collection of instances
   */
  function callPopover (config, instances) {
    if (config.workingRepoInstance) {
      if (instances.models.length === 2 || ( ahaGuide.hasDemoRepo() && instances.models.length === 1) ) {
        $rootScope.$broadcast('launchAhaNavPopover');
        AGC.showAhaNavPopover = true;
      }
    }
  }

  function getClassForSubstep () {
    var err = AGC.showError || AGC.errorState;
    return ahaGuide.getClassForSubstep(err);
  }

  $scope.$on('$destroy', function () {
    animatedPanelListener();
    if (AGC.subStepIndex === 7 && !AGC.isBuildSuccessful) {
      $rootScope.$broadcast('ahaGuideEvent', {
        error: 'exitedEarly'
      });
    }
  });

  animatedPanelListener = $rootScope.$on('changed-animated-panel', function (e, panel) {
    updateCaption(panel);
  });

  AGC.popoverActions = {
    endGuide: ahaGuide.endGuide
  };
}
