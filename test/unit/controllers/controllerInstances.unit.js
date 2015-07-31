'use strict';

var $controller,
    $rootScope,
    $timeout,
    $scope,
    $localStorage,
    keypather,
    $state,
    $q;
var apiMocks = require('../apiMocks/index');
var mockFetch = new (require('../fixtures/mockFetch'))();
var runnable = window.runnable;

/**
 * Things to test:
 * Since this controller is pretty simple, we only need to test it's redirection
 */
describe('ControllerInstances'.bold.underline.blue, function () {
  var ctx = {};
  function setup(activeAccountUsername, localStorageData) {
    mockFetch.clearDeferer();
    angular.mock.module('app');
    ctx.fakeuser = {
      attrs: angular.copy(apiMocks.user),
      oauthName: function () {
        return 'user';
      }
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

    ctx.userList = {
      user: ctx.fakeuser,
      org1: ctx.fakeOrg1,
      org2: ctx.fakeOrg2
    };

    ctx.instanceLists = {
      user: {
        models: [{
          attrs: angular.copy(apiMocks.instances.running)
        }, {
          attrs: angular.copy(apiMocks.instances.stopped)
        }]
      },
      org1: {
        models: [{
          attrs: angular.copy(apiMocks.instances.building)
        }]
      },
      org2: {
        models: []
      }
    };
    ctx.setupInstanceResponse = function(username, cb) {
      return function (overrideUsername) {
        cb(null, ctx.instanceLists[overrideUsername || username], overrideUsername || username);
      };
    };
    ctx.stateParams = {
      userName: activeAccountUsername || 'user'
    };
    angular.mock.module('app', function ($provide) {
      $provide.factory('fetchInstancesByPod', mockFetch.fetch());
      $provide.value('favico', {
        reset : sinon.spy(),
        setInstanceState: sinon.spy()
      });
      $provide.value('$stateParams', ctx.stateParams);
      $provide.value('$localStorage', localStorageData || {});

      $provide.value('user', ctx.fakeuser);
      $provide.value('activeAccount', ctx.fakeuser);


      $provide.factory('setLastOrg', function ($q) {
        return sinon.stub().returns($q.when());
      });
    });
    angular.mock.inject(function (
      _$controller_,
      _$rootScope_,
      _$localStorage_,
      _keypather_,
      _$timeout_,
      _$state_,
      _$q_
    ) {
      keypather = _keypather_;
      $q = _$q_;
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $localStorage = _$localStorage_;
      $timeout = _$timeout_;
      $state = _$state_;
    });

    if (activeAccountUsername) {
      keypather.set($rootScope, 'dataApp.data.activeAccount', ctx.userList[activeAccountUsername]);
    }
    $state.params = ctx.stateParams;
    ctx.fakeGo = sinon.stub($state, 'go');
    var ca = $controller('ControllerInstances', {
      '$scope': $scope,
      '$rootScope': $rootScope,
      '$state': $state,
      '$stateParams': ctx.stateParams,
      '$localStorage': $localStorage
    });
    $rootScope.$digest();
  }
  describe('No local storage options'.blue, function () {
    it('should navigate to the first (alphabetical) instance for user', function () {
      setup('SomeKittens');
      $rootScope.$digest();
      var userInstance = runnable.newInstance(apiMocks.instances.running, {noStore: true});
      userInstance.attrs.createdBy.username = 'SomeKittens';
      var many = runnable.newInstances(
        [userInstance, apiMocks.instances.stopped],
        {noStore: true}
      );
      many.forEach(function (instance) {
        instance.children = {
          models: [],
          fetch: sinon.stub().callsArg(1)
        };
      });
      sinon.stub($state, 'includes')
        .withArgs('instances').returns(true)
        .withArgs('instance').returns(false);
      mockFetch.triggerPromise(many);
      $rootScope.$digest();
      sinon.assert.calledWith(ctx.fakeGo, 'base.instances.instance', {
        userName: 'SomeKittens',
        instanceName: 'spaaace'
      });
    });

    it('should not navigate when the state changes before the instances return ', function () {
      setup('SomeKittens');
      $rootScope.$digest();
      var userInstance = runnable.newInstance(apiMocks.instances.running, {noStore: true});
      userInstance.attrs.createdBy.username = 'SomeKittens';
      var many = runnable.newInstances(
        [userInstance, apiMocks.instances.stopped],
        {noStore: true}
      );
      many.forEach(function (instance) {
        instance.children = {
          models: [],
          fetch: sinon.stub().callsArg(1)
        };
      });
      sinon.stub($state, 'includes')
        .withArgs('instances').returns(true)
        .withArgs('instance').returns(false);

      ctx.stateParams.userName = 'NotSomeKittens';
      mockFetch.triggerPromise(many);
      $rootScope.$digest();
      sinon.assert.neverCalledWith(ctx.fakeGo, 'base.instances.instance', {
        userName: 'SomeKittens',
        instanceName: 'spaaace'
      });
    });
    it('should navigate to new for org2', function () {
      setup('org2');
      $rootScope.$digest();
      var many = runnable.newInstances(
        [],
        {noStore: true}
      );
      sinon.stub($state, 'includes')
        .withArgs('instances').returns(true)
        .withArgs('instance').returns(false);
      mockFetch.triggerPromise(many);
      $rootScope.$digest();
      sinon.assert.calledWith(ctx.fakeGo, 'base.config', {
        userName: 'org2'
      });
    });
  });
  describe('local storage options'.blue, function () {
    it('should navigate based on local storage');
  });
  describe('multiple requests for different active accounts'.blue, function () {
    it('should only care about the last requested user, even when the responses are out of order', function () {
      setup('org1');
      $rootScope.$digest();

      var many = runnable.newInstances(
        [apiMocks.instances.running, apiMocks.instances.stopped],
        {noStore: true}
      );
      many.forEach(function (instance) {
        instance.children = {
          models: [],
          fetch: sinon.stub().callsArg(1)
        };
      });

      // Change the user
      ctx.stateParams.userName = 'org2';
      keypather.set($rootScope, 'dataApp.data.activeAccount', ctx.userList['org2']);

      $controller('ControllerInstances', {
        '$scope': $scope,
        '$rootScope': $rootScope,
        '$state': $state,
        '$stateParams': ctx.stateParams,
        '$localStorage': $localStorage
      });

      $rootScope.$digest();

      mockFetch.triggerPromise(many);
      $rootScope.$digest();
      sinon.assert.neverCalledWith(ctx.fakeGo, 'instance.instance', {
        userName: 'org1',
        instanceName: 'spaaace'
      });

      var runnable2 = new (require('runnable'))('http://example3.com/');
      var many2 = runnable2.newInstances(
        [],
        {noStore: true, reset: true}
      );
      many2.forEach(function (instance) {
        instance.children = {
          models: [],
          fetch: sinon.stub().callsArg(1)
        };
      });
      mockFetch.triggerPromise(many2);
      $rootScope.$digest();
      sinon.assert.neverCalledWith(ctx.fakeGo, 'instance.new', {
        userName: 'org2'
      });
    });
  });
});