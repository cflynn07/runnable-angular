'use strict';

require('app')
  .factory('demoFlowService', demoFlowService);

function demoFlowService(
  $http,
  $localStorage,
  $rootScope,
  $q,
  currentOrg,
  github,
  defaultContainerUrl,
  keypather,
  patchOrgMetadata
) {
  function resetFlags () {
    $localStorage.hasSeenHangTightMessage = false;
    $localStorage.isUsingDemoRepo = false;
    $localStorage.hasSeenUrlCallout = false;
  }

  function setItem (key, value) {
    $localStorage[key] = value;
  }

  function getItem (key) {
    return $localStorage[key];
  }

  function isInDemoFlow () {
    return keypather.get(currentOrg, 'poppa.attrs.metadata.hasAha') &&
      !keypather.get(currentOrg, 'poppa.attrs.metadata.hasCompletedDemo');
  }

  function endDemoFlow() {
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
              currentOrg.poppa.attrs.metadata = updatedOrg.metadata;
            });
        }
      });
  }

  function checkStatusOnInstance (instance) {
    var url = defaultContainerUrl(instance);
    return $http.get(url)
      .then(function (res) {
        return res.status >= 200 && res.status < 300;
      })
      .catch(function () {
        return true;
      });
  }

  function hasSeenHangTightMessage () {
    return $localStorage.hasSeenHangTightMessage;
  }

  function submitDemoPR (instance) {
    var repoOwner = keypather.get(instance, 'attrs.owner.username');
    var repoName = instance.getRepoName();
    return github.createPR(repoOwner, repoName, 'master', 'dark-theme');
  }

  function hasSeenUrlCallout () {
    return $localStorage.hasSeenUrlCallout;
  }

  function setIsUsingDemoRepo (value) {
    $localStorage.isUsingDemoRepo = value;
  }
  function hasAddedBranch (value) {
    if (value !== undefined) {
      $localStorage.hasAddedBranch = value;
    }
    return $localStorage.hasAddedBranch;
  }

  function isUsingDemoRepo () {
    return $localStorage.isUsingDemoRepo;
  }
  $rootScope.$on('demo::dismissUrlCallout', function ($event, instanceId) {
    if (!hasSeenUrlCallout()) {
      setItem('hasSeenUrlCallout', instanceId);
    }
  });

  function isAddingPR () {
    return currentOrg.isPersonalAccount() && isUsingDemoRepo();
  }

  return {
    checkStatusOnInstance: checkStatusOnInstance,
    endDemoFlow: endDemoFlow,
    getItem: getItem,
    hasAddedBranch: hasAddedBranch,
    hasSeenHangTightMessage: hasSeenHangTightMessage,
    hasSeenUrlCallout: hasSeenUrlCallout,
    isAddingPR: isAddingPR,
    isInDemoFlow: isInDemoFlow,
    isUsingDemoRepo: isUsingDemoRepo,
    resetFlags: resetFlags,
    setIsUsingDemoRepo: setIsUsingDemoRepo,
    setItem: setItem,
    submitDemoPR: submitDemoPR
  };
}
