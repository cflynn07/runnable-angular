'use strict';

require('app')
  .controller('ControllerInstances', ControllerInstances);
/**
 * @ngInject
 */
function ControllerInstances(
  $filter,
  $localStorage,
  $rootScope,
  $scope,
  $state,
  activeAccount,
  ahaGuide,
  currentOrg,
  demoFlowService,
  demoRepos,
  errs,
  eventTracking,
  featureFlags,
  fetchInstancesByPod,
  fetchRepoBranches,
  keypather,
  loading,
  ModalService,
  promisify,
  setLastOrg,
  user,
  watchOncePromise
) {
  var CIS = this;
  CIS.userName = $state.params.userName;
  CIS.instanceName = $state.params.instanceName;
  CIS.isInGuide = ahaGuide.isInGuide;
  CIS.shouldShowDemoSelector = demoRepos.shouldShowDemoSelector;
  CIS.isAddingFirstBranch = ahaGuide.isAddingFirstBranch;
  CIS.isSettingUpRunnabot = ahaGuide.isSettingUpRunnabot;
  CIS.isInDemoFlow = demoFlowService.isInDemoFlow;
  CIS.currentOrg = currentOrg;
  CIS.showAutofork = null;
  CIS.searchBranches = null;
  CIS.instanceBranches = null;
  CIS.unbuiltBranches = null;
  CIS.branchQuery = null;
  CIS.$storage = $localStorage.$default({
    instanceListIsClosed: false
  });

  CIS.shouldShowPopover = true;
  $scope.$on('popover-closed', function (event, pop) {
    if (keypather.get(pop, 'data') === 'branchSelect') {
      CIS.shouldShowPopover = true;
    }
  });

  $scope.$on('popover-opened', function (event, pop) {
    if (keypather.get(pop, 'data') === 'branchSelect') {
      CIS.shouldShowPopover = false;
    }
  });

  $scope.$on('showAutoLaunchPopover', function() {
    CIS.showAutofork = true;
  });

  if (demoFlowService.isInDemoFlow()) {
    watchOncePromise($scope, function () {
      return demoFlowService.hasSeenUrlCallout();
    }, true)
      .then(function () {
        checkIfBranchViewShouldBeEnabled();
      });
    // Check branch view first time
    checkIfBranchViewShouldBeEnabled();
  }

  function isInstanceMatch(instance, nameMatch) {
    if (instance.destroyed || !instance.id()) {
      return false;
    }
    if (!nameMatch || instance.attrs.name === nameMatch) {
      return instance;
    }
  }

  fetchInstancesByPod()
    .then(function (instancesByPod) {

      // If the state has already changed don'  t continue with old data. Let the new one execute.
      if (CIS.userName !== $state.params.userName) {
        return;
      }
      CIS.instancesByPod = instancesByPod;
      CIS.activeAccount = activeAccount;

      var instances = instancesByPod;
      var lastViewedInstance = keypather.get(user, 'attrs.userOptions.uiState.previousLocation.instance');

      var targetInstance = null;
      if (lastViewedInstance) {
        targetInstance = instances.find(function (instance) {
          var instanceMatch = isInstanceMatch(instance, lastViewedInstance);
          if (instanceMatch) {
            return instanceMatch;
          }
          if (instance.children) {
            return instance.children.find(function (childInstance) {
              return isInstanceMatch(childInstance, lastViewedInstance);
            });
          }
        });
      }

      if (!targetInstance) {
        targetInstance = $filter('orderBy')(instances, 'attrs.name')
          .find(function (instance) {
            return isInstanceMatch(instance);
          });
      }

      setLastOrg(CIS.userName);

      var instanceName = keypather.get(targetInstance, 'attrs.name');
      if ($state.current.name !== 'base.instances.instance') {
        CIS.checkAndLoadInstance(instanceName);
      } else if (CIS.isInDemoFlow()) {
        if (instances.models.length) {
          demoRepos.shouldShowDemoSelector(false);
        }
        if (!demoFlowService.getItem('launchedFromContainersPage')) {
          return ahaGuide.endGuide({
            hasCompletedDemo: true
          });
        }
      }
    })
    .catch(errs.handler);

  this.showInstanceRunningPopover = function () {
    return CIS.isInDemoFlow() &&
      !demoFlowService.hasSeenUrlCallout() &&
      CIS.getDemoInstance() &&
      CIS.getDemoInstance().getName() !== $state.params.instanceName &&
      CIS.getDemoInstance().status() === 'running';
  };

  this.getUrlCalloutInstance = function () {
    return demoFlowService.hasSeenUrlCallout() ? CIS.instancesByPod.models.find(function (instance) {
      return instance.attrs.id === demoFlowService.hasSeenUrlCallout();
    }) : null;
  };

  this.getInstanceWithBranches = function () {
    return CIS.instancesByPod.models.find(function (instance) {
      return instance.attrs.hasAddedBranches;
    });
  };

  this.showDemoAddBranchView = function () {
    return demoFlowService.isInDemoFlow() && keypather.get(CIS, 'instancesByPod.models.length') && !demoRepos.shouldShowDemoSelector() && CIS.getUrlCalloutInstance() && !CIS.getInstanceWithBranches();
  };

  this.getDemoInstance = function () {
    if (!CIS.demoInstance) {
      CIS.demoInstance = CIS.instancesByPod.models.find(function (instance) {
        return keypather.get(instance, 'contextVersion.getMainAppCodeVersion()');
      });
    }
    return CIS.demoInstance;
  };

  this.checkAndLoadInstance = function (instanceName) {
    if (instanceName) {
      return $state.go('base.instances.instance', {
        instanceName: instanceName
      }, {location: 'replace'});
    }
    if (!featureFlags.flags.containersViewTemplateControls) {
      return $state.go('base.config', {
        userName: CIS.userName
      }, {location: 'replace'});
    }
  };

  this.filterMatchedAnything = function () {
    if (!CIS.searchBranches) {
      return true;
    }
    if (!CIS.instancesByPod) {
      return true;
    }

    return CIS.instancesByPod.models.some(function (masterPod) {
      return CIS.filterMasterInstance(masterPod) || CIS.shouldShowParent(masterPod);
    });
  };

  this.filterMasterInstance = function (masterPod) {
    if (!CIS.searchBranches) {
      return true;
    }
    var searchQuery = CIS.searchBranches.toLowerCase();
    var instanceName = masterPod.getRepoAndBranchName() + masterPod.attrs.lowerName;
    return instanceName.toLowerCase().indexOf(searchQuery) !== -1;
  };

  this.getFilteredInstanceList = function () {
    if (!CIS.instancesByPod) {
      return null;
    }
    if (!CIS.searchBranches) {
      return CIS.instancesByPod.models;
    }
    return CIS.instancesByPod.models
      .filter(CIS.filterMasterInstance);
  };

  this.getFilteredBranches = function () {
    if (!CIS.branchQuery) {
      return CIS.instanceBranches;
    }
    var branchName;
    var searchQuery = CIS.branchQuery.toLowerCase();
    return CIS.instanceBranches.filter(function (branch) {
      branchName = branch.attrs.name.toLowerCase();
      return branchName.includes(searchQuery);
    });
  };

  this.shouldShowChild = function (childInstance) {
    if (!CIS.searchBranches) {
      return true;
    }
    var searchQuery = CIS.searchBranches.toLowerCase();
    return childInstance.getBranchName().toLowerCase().indexOf(searchQuery) !== -1;
  };

  this.shouldShowParent = function (masterPod) {
    if (!CIS.searchBranches) {
      return true;
    }
    if (!masterPod.children) {
      return false;
    }
    return masterPod.children.models.some(CIS.shouldShowChild);
  };

  this.getUnbuiltBranches = function (instance, branches) {
    var branchName;
    var childInstances = instance.children.models.reduce(function (childHash, child) {
      branchName = child.getBranchName();
      childHash[branchName] = branchName;
      return childHash;
    }, {});
    var instanceBranchName = instance.getBranchName();
    childInstances[instanceBranchName] = instanceBranchName;
    var unbuiltBranches = branches.models.filter(function (branch) {
      branchName = keypather.get(branch, 'attrs.name');
      return !childInstances[branchName];
    });
    return unbuiltBranches;
  };

  this.popInstanceOpen = function (instance, open) {
    CIS.instanceBranches = null;
    CIS.poppedInstance = instance;
    loading('fetchingBranches', true);
    return CIS.getAllBranches(instance)
      .then(function (branches) {
        CIS.totalInstanceBranches = branches.models.length;
        CIS.instanceBranches = CIS.getUnbuiltBranches(instance, branches);
        loading('fetchingBranches', false);
      });
  };

  this.getAllBranches = function (instance) {
    return promisify(currentOrg.github, 'fetchRepo')(instance.getRepoName())
      .then(function (repo) {
        return fetchRepoBranches(repo);
      });
  };

  this.forkBranchFromInstance = function (branch, closePopover) {
    var sha = branch.attrs.commit.sha;
    var branchName = branch.attrs.name;
    loading(branchName, true);
    loading('buildingForkedBranch', true);
    promisify(CIS.poppedInstance, 'fork')(branchName, sha)
      .then(function (instance) {
        var newInstances = instance.children.models.filter(function(childInstance) {
          return childInstance.attrs.name === branchName + '-' + instance.attrs.name;
        });
        loading(branchName, false);
        loading('buildingForkedBranch', false);
        closePopover();
        if (newInstances.length) {
          $state.go('base.instances.instance', {
            instanceName: newInstances[0].attrs.name
          });
        }
      })
      .catch(errs.handler);
  };

  this.editInstance = function (instance) {
    ModalService.showModal({
      controller: 'EditServerModalController',
      controllerAs: 'SMC',
      templateUrl: 'editServerModalView',
      inputs: {
        tab: keypather.get(instance, 'contextVersion.attrs.advanced') ? 'env' : 'repository',
        instance: instance,
        actions: {}
      }
    })
      .catch(errs.handler);
  };

  this.setAutofork = function () {
    CIS.poppedInstance.attrs.shouldNotAutofork = !CIS.poppedInstance.attrs.shouldNotAutofork;
    if (!CIS.poppedInstance.attrs.shouldNotAutofork) {
      eventTracking.enabledAutoLaunch();
    }
    if (CIS.isInGuide() && !CIS.poppedInstance.attrs.shouldNotAutofork) {
      var childWatcher = $scope.$watch('CIS.poppedInstance.children.models.length', function (length) {
        if (length) {
          $rootScope.$broadcast('ahaGuide::launchModal');
          childWatcher();
        }
      });
    } else if (!CIS.poppedInstance.attrs.shouldNotAutofork) {
      CIS.showAutofork = false;
    }
    promisify(CIS.poppedInstance, 'update')({ shouldNotAutofork: CIS.poppedInstance.attrs.shouldNotAutofork })
      .catch(function () {
        CIS.poppedInstance.attrs.shouldNotAutofork = !CIS.poppedInstance.attrs.shouldNotAutofork;
      });
  };

  this.addOwnRepo = function () {
    ModalService.showModal({
      controller: 'NewContainerModalController',
      controllerAs: 'NCMC',
      templateUrl: 'newContainerModalView'
    });
  };

  function checkIfBranchViewShouldBeEnabled () {
    if (!demoFlowService.isInDemoFlow() || !demoFlowService.hasSeenUrlCallout()) {
      return;
    }
    return fetchInstancesByPod()
      .then(function (instances) {
        return instances.find(function (instance) {
          return instance.attrs.id === demoFlowService.hasSeenUrlCallout();
        });
      })
      .then(function (instance) {
        if (instance) {
          CIS.isUsingDemoRepo = demoFlowService.isUsingDemoRepo();
          return;
        }
      });
  }
}
