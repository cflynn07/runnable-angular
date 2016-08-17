'use strict';

var $controller,
    $rootScope,
    $scope,
    $window;
var keypather;

var User = require('@runnable/api-client/lib/models/user');
var apiMocks = require('../apiMocks/index');
var keypather = require('keypather')();
var User = require('@runnable/api-client/lib/models/user');
var user = require('../apiMocks').user;

describe('controllerApp'.bold.underline.blue, function () {
  var ctx = {};
  var CA;
  var mockLocalStorage;
  function createMasterPods() {
    ctx.masterPods = runnable.newInstances(
      [apiMocks.instances.building, apiMocks.instances.runningWithContainers[0]],
      {noStore: true}
    );
    return ctx.masterPods;
  }
  function setup(stateParams, intercom) {
    ctx = {};
    ctx.fetchInstancesByPodMock = new (require('../fixtures/mockFetch'))();
    angular.mock.module('app');
    ctx.fakeuser = new User(angular.copy(apiMocks.user));
    ctx.fakeuser.trialDaysRemaining = sinon.stub();
    ctx.fakeuser.isInTrial = sinon.stub();
    ctx.fakeuser.socket = {
      joinOrgRoom: sinon.spy()
    };
    ctx.fakeOrg1 = {
      attrs: angular.copy(apiMocks.user),
      oauthName: function () {
        return 'org1';
      }
    };
    ctx.fakeOrg2 = {
      attrs: angular.copy(apiMocks.user),
      oauthName: function () {
        return 'org2';
      }
    };
    ctx.fakeOrgs = {models: [ctx.fakeOrg1, ctx.fakeOrg2]};
    ctx.stateParams = stateParams || {
      userName: 'username',
      instanceName: 'instancename'
    };
    ctx.fakeErrs = {
      handler: sinon.spy(),
      clearErrors: sinon.spy(),
      errors: []
    };
    mockLocalStorage = {};
    angular.mock.module('app', function ($provide) {
      $provide.factory('fetchInstancesByPod', ctx.fetchInstancesByPodMock.autoTrigger(createMasterPods()));
      $provide.value('$stateParams', ctx.stateParams);
      $provide.value('user', ctx.fakeuser);
      $provide.value('orgs', ctx.fakeOrgs);
      $provide.value('activeAccount', ctx.fakeuser);
      $provide.value('errs', ctx.fakeErrs);
      $provide.value('$localStorage', mockLocalStorage);
    });
    angular.mock.inject(function (
      _$controller_,
      _$rootScope_,
      _keypather_,
      _$window_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      keypather = _keypather_;
      $window = _$window_;
    });
    if ($window.Intercom) {
      sinon.stub($window, 'Intercom', noop);
    }

    CA = $controller('ControllerApp', {
      '$scope': $scope
    });
    $rootScope.$apply();
  }

  function tearDown () {
    keypather.get($window, 'Intercom.restore()');
  }

  describe('basics'.blue, function () {

    beforeEach(function () {
      // Error when not wrapped
      setup();
    });

    afterEach(function () {
      tearDown();
    });

    it('initalizes $scope.dataApp properly', function () {
      expect($scope.dataApp).to.be.an.Object;
      $rootScope.$digest();
      $scope.dataApp.data.modalError.actions.close();
      sinon.assert.calledOnce(ctx.fakeErrs.clearErrors);
    });

    it('creates a click handler that broadcasts', function () {
      $rootScope.$digest();

      var spy = sinon.spy();
      $scope.$on('app-document-click', spy);

      $scope.dataApp.documentClickEventHandler({
        target: 'foo'
      });

      expect(spy.calledOnce).to.equal(true);
      expect(spy.lastCall.args[1]).to.equal('foo');
    });


    it('should join the org room for the user', function () {
      sinon.assert.calledOnce(ctx.fakeuser.socket.joinOrgRoom);
    });
  });

  describe('showTrialEndingNotification', function () {
    beforeEach(function () {
      keypather.set($rootScope, 'featureFlags.billing', true);
      keypather.set(mockLocalStorage, 'hasDismissedTrialNotification.' + ctx.fakeuser.attrs.id, false);
      ctx.fakeuser.isInTrial.returns(true);
      ctx.fakeuser.trialDaysRemaining.returns(3);
    });

    it('should not show if not in trial', function () {
      ctx.fakeuser.isInTrial.returns(false);
      expect(CA.showTrialEndingNotification()).to.equal(false);
    });

    it('should not show if trial ends in more than 3 days', function () {
      ctx.fakeuser.trialDaysRemaining.returns(4);
      expect(CA.showTrialEndingNotification()).to.equal(false);
    });

    it('should not show if billing feature flag is set', function () {
      keypather.set($rootScope, 'featureFlags.billing', false);
      expect(CA.showTrialEndingNotification()).to.equal(false);
    });

    it('should not show if local storage shows its been dismissed', function () {
      keypather.set(mockLocalStorage, 'hasDismissedTrialNotification.' + ctx.fakeuser.attrs.id, true);
      expect(CA.showTrialEndingNotification()).to.equal(false);
    });

    it('should show if in trial that ends in less or equal to 3 days with feature flag and has not been dismissed', function () {
      expect(CA.showTrialEndingNotification()).to.equal(true);
    });
  });

  describe('closeTrialEndingNotification', function () {
    it('should set hasDismissedTrialNotification on local storage', function () {
      keypather.set(mockLocalStorage, 'hasDismissedTrialNotification.' + ctx.fakeuser.attrs.id, false);
      CA.closeTrialEndingNotification();
      expect(mockLocalStorage.hasDismissedTrialNotification[ctx.fakeuser.attrs.id]).to.equal(true);
    });
  });
});
