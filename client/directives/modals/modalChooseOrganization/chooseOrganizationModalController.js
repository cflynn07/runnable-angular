'use strict';

require('app')
  .controller('ChooseOrganizationModalController', ChooseOrganizationModalController);
function ChooseOrganizationModalController(
  $interval,
  $rootScope,
  $scope,
  $state,
  ahaGuide,
  createNewSandboxForUserService,
  errs,
  featureFlags,
  fetchWhitelistForDockCreated,
  keypather,
  loading,
  promisify,

  // Injected
  close,
  grantedOrgs,
  user,
  whitelistedOrgs
) {
  var COMC = this;
  COMC.close = close;
  COMC.user = user;
  loading.reset('chooseOrg');
  $rootScope.featureFlags = featureFlags.flags;
  COMC.allAccounts = grantedOrgs;
  COMC.whitelistedOrgs = whitelistedOrgs;

  COMC.showGrantAccess = COMC.allAccounts.length === 0;
  var pollingPromise = angular.noop;

  COMC.grantAccess = function () {
    loading.reset('grantAccess');
    loading('grantAccess', true);
    $interval.cancel(pollingPromise);
    var originalOrgCount = grantedOrgs.models.length;
    pollingPromise = $interval(function () {
      promisify(grantedOrgs, 'fetch')({'_bustCache': Math.random()})
        .then(function (orgs) {
          if (orgs.models.length !== originalOrgCount) {
            COMC.showGrantAccess = false;
            loading('grantAccess', false);
          }
        });
    }, 1000 * 5);
  };

  $scope.$on('$destroy', function () {
    $interval.cancel(pollingPromise);
  });

  // otherwise the user can clear away the model
  // this will be re-added when they transition to something else
  keypather.set($rootScope, 'dataApp.documentKeydownEventHandler', null);

  COMC.fetchUpdatedWhitelistedOrg = function (selectedOrgName) {
    return fetchWhitelistForDockCreated()
      .then(function (res) {
        COMC.whitelistedOrgs = res;
        return COMC.matchWhitelistedOrgByName(selectedOrgName);
      });
  };

  COMC.actions = {
    createOrCheckDock: function (selectedOrgName, goToPanelCb) {
      var selectedOrg = COMC.getSelectedOrg(selectedOrgName);
      if (!selectedOrg) {
        return;
      }
      loading('chooseOrg', true);
      return COMC.fetchUpdatedWhitelistedOrg(selectedOrgName)
        .then(function (foundWhitelistedOrg) {
          if (foundWhitelistedOrg) {
            return foundWhitelistedOrg;
          }
          return createNewSandboxForUserService(selectedOrgName)
            .then(function () {
              return null;
            });
        })
        .then(function (org) {
          if (keypather.get(org, 'attrs.firstDockCreated')) {
            return COMC.actions.selectAccount(selectedOrgName);
          }

          COMC.pollForDockCreated(org, selectedOrgName, goToPanelCb);
        })
        .catch(errs.handler)
        .finally(function () {
          loading('chooseOrg', false);
        });
    },
    selectAccount: function (selectedOrgName) {
      close();
      $state.go('base.instances', {
        userName: selectedOrgName
      });
    }
  };

  // Searching methods
  COMC.matchWhitelistedOrgByName = function (selectedOrgName) {
    return COMC.whitelistedOrgs.find(function (org) {
      return selectedOrgName.toLowerCase() === org.attrs.name.toLowerCase();
    });
  };
  COMC.getSelectedOrg = function (selectedOrgName) {
    return COMC.allAccounts.models.find(function (org) {
      return selectedOrgName.toLowerCase() === org.oauthName().toLowerCase();
    });
  };
  COMC.isChoosingOrg = ahaGuide.isChoosingOrg;

  // Polling stuff
  COMC.cancelPolling = function () {
    if (COMC.pollingInterval) {
      $interval.cancel(COMC.pollingInterval);
    }
  };

  COMC.selectedOrgName = null;
  COMC.pollForDockCreated = function (whitelistedDock, selectedOrgName, goToPanelCb) {
    COMC.selectedOrgName = selectedOrgName;
    COMC.cancelPolling();
    if (keypather.get(whitelistedDock, 'attrs.firstDockCreated')) {
      return goToPanelCb('dockLoaded');
    }
    goToPanelCb('dockLoading');

    COMC.pollingInterval = $interval(function () {
      COMC.fetchUpdatedWhitelistedOrg(selectedOrgName)
        .then(function (updatedOrg) {
          if (keypather.get(updatedOrg, 'attrs.firstDockCreated')) {
            COMC.cancelPolling();
            return goToPanelCb('dockLoaded');
          }
        });
    }, 1000);
  };

  // Since this is a root route, it needs this stuff
  $scope.$watch(function () {
    return errs.errors.length;
  }, function (n) {
    if (n) {
      keypather.set($rootScope, 'dataApp.data.modalError.data.errors', errs.errors);
      keypather.set($rootScope, 'dataApp.data.modalError.data.in', true);
    }
  });

  keypather.set($rootScope, 'dataApp.data.modalError.actions', {
    close: function () {
      errs.clearErrors();
      keypather.set($rootScope, 'dataApp.data.modalError.data.in', false);
    }
  });
}
