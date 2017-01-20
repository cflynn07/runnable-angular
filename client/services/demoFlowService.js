'use strict';

require('app')
  .factory('demoFlowService', demoFlowService);

function demoFlowService(
  $http,
  $localStorage,
  $rootScope,
  $q,
  currentOrg,
  errs,
  fetchInstancesByPod,
  github,
  defaultContainerUrl,
  featureFlags,
  keypather,
  patchOrgMetadata,
  promisify
) {

  if (isInDemoFlow()) {
    addEventListeners();
  }

  if (usingDemoRepo() || isInDemoFlow()) {
    fetchInstancesByPod()
      .then(function(instances) {
        instances.on('add', function deleteUsingDemoRepoKey() {
          if (instances.models.length > 2) {
            deleteItem('usingDemoRepo');
            instances.off('add', deleteUsingDemoRepoKey);
          }
        });
      });
  }

  function resetFlags () {
    deleteItem('hasSeenHangTightMessage');
    deleteItem('hasSeenUrlCallout');
    deleteItem('hasSeenAddBranchCTA');
  }

  function setItem (key, value) {
    $localStorage[currentOrg.poppa.attrs.id + '-' + key] = value;
  }

  function getItem (key) {
    return $localStorage[currentOrg.poppa.attrs.id + '-' + key];
  }

  function deleteItem (key) {
    delete $localStorage[currentOrg.poppa.attrs.id + '-' + key];
  }

  function isInDemoFlow () {
    return keypather.get(currentOrg, 'poppa.attrs.metadata.hasAha') &&
      !keypather.get(currentOrg, 'poppa.attrs.metadata.hasCompletedDemo');
  }

  function endDemoFlow () {
    return $q.when()
      .then(function () {
        if (isInDemoFlow()) {
          return patchOrgMetadata(currentOrg.poppa.id(), {
            metadata: {
              hasAha: false,
              hasCompletedDemo: true,
              hasConfirmedSetup: true
            }
          })
            .then(function (updatedOrg) {
              resetFlags();
              currentOrg.poppa.attrs.metadata = updatedOrg.metadata;
            });
        }
       });
  }

  function addEventListeners () {
    // listen for the end of the demo if we are in it
    $rootScope.$on('demo::completed', function () {
      endDemoFlow();
    });

    // listen for the url open event if the user hasn't done it yet
    if (featureFlags.flags.demoAutoAddBranch && !$localStorage.hasSeenUrlCallout) {
      var unregisterContainerUrlClickListener = $rootScope.$on('clickedOpenContainerUrl', function (event, instance) {
        unregisterContainerUrlClickListener();
        forkNewInstance(instance)
          .then(function () {
            if (currentOrg.isPersonalAccount()) {
              submitDemoPR(instance)
                .catch(function (err) {
                  if (keypather.get(err, 'errors[0].message').match(/(pull request.*exists)/)) {
                    return instance;
                  }
                  errs.handler(err);
                });
              }
          });
      });
    }

    // listen for the click on a new instance if the user has clicked open url
    if (featureFlags.flags.demoAutoAddBranch && getItem('hasSeenUrlCallout') && !getItem('hasSeenAddBranchCTA')) {
      addBranchListener();
    }
  }

  function addBranchListener () {
    var unregisterStateChangeListener = $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
      var instanceName = keypather.get(toParams, 'instanceName');
      if (instanceName && instanceName.match(/dark-theme/)) {
        setItem('hasSeenAddBranchCTA', true);
        hasAddedBranch(true);
        unregisterStateChangeListener();
      }
    });
  }

  function checkStatusOnInstance (instance) {
    // This is needed to fix an issue with 'Response for preflight has invalid HTTP status code 404'
    // Caused by the X-CSRF-TOKEN
    var url = defaultContainerUrl(instance, true);
    return $http({
      method: 'GET',
      url: url,
      headers: {
        'X-CSRF-TOKEN': undefined
      }
    })
      .then(function (res) {
        return res.status >= 200 && res.status < 300;
      })
      .catch(function () {
        return true;
      });
  }

  function forkNewInstance (instance) {
    addBranchListener();
    return promisify(currentOrg.github, 'fetchRepo')(instance.getRepoName())
      .then(function (repo) {
        return promisify(repo, 'fetchBranch')('dark-theme');
      })
      .then(function (branch) {
        var sha = branch.attrs.commit.sha;
        var branchName = branch.attrs.name;
        return promisify(instance, 'fork')(branchName, sha);
      });
  }

  function hasSeenHangTightMessage () {
    return getItem('hasSeenHangTightMessage');
  }

  function submitDemoPR (instance) {
    var repoOwner = keypather.get(instance, 'attrs.owner.username');
    var repoName = instance.getRepoName();
    return github.createPR(repoOwner, repoName, 'master', 'dark-theme');
  }

  function hasSeenUrlCallout () {
    return getItem('hasSeenUrlCallout');
  }

  function setUsingDemoRepo (value) {
    setItem('usingDemoRepo', value);
  }

  function hasAddedBranch (value) {
    if (value !== undefined) {
      setItem('hasAddedBranch', value);
    }
    return getItem('hasAddedBranch');
  }

  function usingDemoRepo () {
    return getItem('usingDemoRepo');
  }
  $rootScope.$on('demo::dismissUrlCallout', function ($event, instanceId) {
    if (!hasSeenUrlCallout()) {
      setItem('hasSeenUrlCallout', instanceId);
    }
  });

  function shouldAddPR () {
    return currentOrg.isPersonalAccount() && usingDemoRepo();
  }
  function shouldShowTeamCTA () {
    return currentOrg.isPersonalAccount() && !isInDemoFlow();
  }

  function shouldShowServicesCTA () {
    return !currentOrg.isPersonalAccount() && isInDemoFlow() && getItem('usingDemoRepo') && hasAddedBranch();
  }

  function shouldShowAddBranchCTA (instance) {
    return isInDemoFlow() && !getItem('hasSeenAddBranchCTA') && instance.attrs.id === getItem('hasSeenUrlCallout');
  }

  return {
    addBranchListener: addBranchListener,
    checkStatusOnInstance: checkStatusOnInstance,
    deleteItem: deleteItem,
    endDemoFlow: endDemoFlow,
    getItem: getItem,
    hasAddedBranch: hasAddedBranch,
    hasSeenHangTightMessage: hasSeenHangTightMessage,
    hasSeenUrlCallout: hasSeenUrlCallout,
    shouldAddPR: shouldAddPR,
    isInDemoFlow: isInDemoFlow,
    usingDemoRepo: usingDemoRepo,
    resetFlags: resetFlags,
    setUsingDemoRepo: setUsingDemoRepo,
    setItem: setItem,
    submitDemoPR: submitDemoPR,
    shouldShowAddBranchCTA: shouldShowAddBranchCTA,
    shouldShowTeamCTA: shouldShowTeamCTA,
    shouldShowServicesCTA: shouldShowServicesCTA
  };
}
