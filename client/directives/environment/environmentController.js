'use strict';

require('app')
  .controller('EnvironmentController', EnvironmentController);
/**
 * EnvironmentController
 * @constructor
 * @export
 * @ngInject
 */
function EnvironmentController(
  $scope,
  $timeout,
  createNewInstance,
  errs,
  eventTracking,
  favico,
  fetchContexts,
  fetchInstances,
  fetchInstancesByPod,
  fetchStackInfo,
  keypather,
  pageName,
  promisify,
  $rootScope,
  $q,
  helpCards,
  $window,
  $state,
  ModalService
) {
  $scope.$state = $state;
  favico.reset();
  pageName.setTitle('Configure - Runnable');
  $scope.data = {
    helpCards: helpCards
  };
  fetchInstancesByPod($state.userName)
    .then(function (instances) {
      $scope.data.instances = instances;
    });

  $scope.state = {
    validation: {
      env: {}
    },
    helpCard: null,
    newServerButton: {
      active: false
    }
  };

  $scope.help = helpCards.cards;
  $scope.helpCards = helpCards;

  helpCards.clearAllCards();

  $scope.helpUndock = false;

  var scrollHelper = function () {
    var newVal = false;
    if ($window.scrollY > 75) {
      newVal = true;
    }
    if ($scope.helpUndock !== newVal) {
      $scope.helpUndock = newVal;
      $timeout(angular.noop);
    }
  };
  $scope.$on('helpCardScroll:enable', function () {
    $window.addEventListener('scroll', scrollHelper);
    scrollHelper();
  });
  $scope.$on('helpCardScroll:disable', function () {
    $window.removeEventListener('scroll', scrollHelper);
  });

  $scope.$on('$destroy', function () {
    $window.removeEventListener('scroll', scrollHelper);
  });

  $scope.alert = null;

  $scope.$on('alert', function (evt, data) {
    $scope.alert = data;
    $timeout(function () {
      $scope.alert = null;
    }, 5000);
  });

  $scope.helpPopover = {
    data: $scope.help,
    actions: {
      ignoreHelp: function (help) {
        helpCards.ignoreCard(help);
      },
      getHelp: function (help) {
        helpCards.setActiveCard(help);
        $rootScope.$broadcast('close-popovers');
      }
    }
  };

  $scope.actions = {
    deleteServer: function (instance) {
      $rootScope.$broadcast('close-popovers');
      ModalService.showModal({
        controller: 'ConfirmationModalController',
        controllerAs: 'CMC',
        templateUrl: 'confirmDeleteServerView'
      })
        .then(function (modal) {
          modal.close.then(function (confirmed) {
            if ( confirmed ) {
              promisify(instance, 'destroy')()
                .catch(errs.handler);
              helpCards.refreshAllCards();
            }
          });
        })
        .catch(errs.handler);
    },
    createAndBuild: function (createPromise, name) {
      $rootScope.$broadcast('close-modal');

      eventTracking.triggeredBuild(false);
      // Save this in case it changes
      var cachedActiveAccount = $rootScope.dataApp.data.activeAccount;
      var instance = $rootScope.dataApp.data.user.newInstance({
        name: name,
        owner: {
          username: cachedActiveAccount.oauthName()
        }
      }, { warn: false });
      $rootScope.dataApp.creatingInstance = !keypather.get($scope, 'data.instances.models.length');
      $scope.data.instances.add(instance);
      helpCards.hideActiveCard();

      $rootScope.$broadcast('alert', {
        type: 'success',
        text: 'Your new container is building.'
      });

      return createPromise
        .then(function (newServerModel) {
          return createNewInstance(
            cachedActiveAccount,
            newServerModel.build,
            newServerModel.opts,
            instance
          );
        })
        .then(function (instance) {
          helpCards.refreshAllCards();
          return instance;
        })
        .catch(function (err) {
          errs.handler(err);
          // Remove it from the servers list
          instance.dealloc();
        })
        .finally(function () {
          $rootScope.dataApp.creatingInstance = false;
        });
    },
    setupRepoServer: function () {
      $rootScope.$broadcast('close-popovers');
      ModalService.showModal({
        controller: 'SetupServerModalController',
        controllerAs: 'SMC',
        templateUrl: 'setupServerModalView',
        inputs: {
          data: $scope.data,
          actions: $scope.actions
        }
      });
    }
  };

  $q.all({
    deps: fetchInstances({ githubUsername: 'HelloRunnable' }),
    sourceContexts: fetchContexts({ isSource: true }),
    stacks: fetchStackInfo()
  })
    .then(function (data) {
      $scope.data.allDependencies = data.deps;
      $scope.data.stacks = data.stacks;
      $scope.data.sourceContexts = data.sourceContexts;
    })
    .catch(errs.handler);

}
