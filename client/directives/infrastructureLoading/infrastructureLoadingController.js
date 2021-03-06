'use strict';

require('app')
  .controller('InfrastructureLoadingController', InfrastructureLoadingController);

function InfrastructureLoadingController(
  $interval,
  $q,
  $scope,
  $state,
  ahaGuide,
  createNewSandboxForUserService,
  currentOrg,
  errs,
  eventTracking,
  fetchGrantedGithubOrgs,
  fetchUser,
  fetchWhitelistForDockCreated,
  keypather,
  loading,
  close
) {
  var IR = this;
  IR.currentOrg = currentOrg;

  fetchUser()
    .then(function (user) {
      IR.user = user;
    });

  IR.getSelectedOrg = function (selectedOrgName) {
    return $q.all([
      fetchGrantedGithubOrgs(),
      fetchUser()
    ])
      .then(function (res) {
        var selectedOrg = IR.matchWhitelistedOrgByName(res[0].models, selectedOrgName);
        if (!selectedOrg && selectedOrgName.toLowerCase() === keypather.get(res[1], 'accounts.github.username')) {
          selectedOrg = res[1];
        }
        return selectedOrg;
      });
  };

  IR.fetchUpdatedWhitelistedOrg = function (selectedOrgName) {
    return fetchWhitelistForDockCreated()
      .then(function (whiteListedOrgs) {
        return IR.matchWhitelistedOrgByName(whiteListedOrgs, selectedOrgName);
      });
  };

  IR.matchWhitelistedOrgByName = function (whiteListedOrgs, selectedOrgName) {
    return whiteListedOrgs.find(function (org) {
      var name = org.attrs.name || org.attrs.login;
      return selectedOrgName.toLowerCase() === name.toLowerCase();
    });
  };

  IR.checkDock = function (selectedOrgName) {
    loading('chooseOrg', true);
    return IR.fetchUpdatedWhitelistedOrg(selectedOrgName)
      .then(function (org) {
        eventTracking.spunUpInfrastructure();
        if (keypather.get(org, 'attrs.firstDockCreated')) {
          return;
        }
        IR.pollForDockCreated(org, selectedOrgName);
      })
      .catch(errs.handler)
      .finally(function () {
        loading('chooseOrg', false);
      });
  };

  IR.handleDockCreated = function (selectedOrgName) {
    eventTracking.updateCurrentPersonProfile(ahaGuide.getCurrentStep(), selectedOrgName);
    IR.cancelPollingForDockCreated();
    return close(); // Close modal
  };

  IR.pollForDockCreated = function (whitelistedDock, selectedOrgName) {
    if (keypather.get(whitelistedDock, 'attrs.firstDockCreated')) {
      return IR.handleDockCreated(selectedOrgName);
    }
    $scope.$broadcast('go-to-panel', 'dockLoading');

    IR.pollForDockCreatedPromise = $interval(function () {
      IR.fetchUpdatedWhitelistedOrg(selectedOrgName)
        .then(function (updatedOrg) {
          if (keypather.get(updatedOrg, 'attrs.firstDockCreated')) {
            return IR.handleDockCreated(selectedOrgName);
          }
        });
    }, 1000);
  };

  IR.cancelPollingForDockCreated = function () {
    if (IR.pollForDockCreatedPromise) {
      $interval.cancel(IR.pollForDockCreatedPromise);
    }
  };

  $scope.$on('$destroy', function () {
    IR.cancelPollingForDockCreated();
  });

  // Init
  IR.checkDock(currentOrg.poppa.attrs.name);
}
