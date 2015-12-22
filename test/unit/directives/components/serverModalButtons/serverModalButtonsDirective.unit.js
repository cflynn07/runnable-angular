'use strict';

var $rootScope,
  $scope;
var element;
var $compile;
var keypather;
var $q;
var $elScope;
var readOnlySwitchController;
var apiMocks = require('./../../../apiMocks/index');

describe('serverModalButtonsDirective'.bold.underline.blue, function () {
  var ctx;

  beforeEach(function () {
    ctx = {};
  });

  beforeEach(function () {
    ctx.errsMock = {
      handler: sinon.spy()
    };
    ctx.serverModalController = {
      name: 'editServerModal',
      instance: ctx.instance,
      getUpdatePromise: sinon.stub(),
      createServer: sinon.stub(),
      changeTab: sinon.stub(),
      state: {
        contextVersion: ctx.cv
      }
    };

    ctx.loadingMock = sinon.spy();
    angular.mock.module('app', function ($provide) {
      $provide.value('errs', ctx.errsMock);
      $provide.value('loading', ctx.loadingMock);
    });
    angular.mock.inject(function (_$compile_, _$timeout_, _$rootScope_, _$q_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $scope = $rootScope.$new();
      $q = _$q_;

      $rootScope.isLoading = {};
      var template = directiveTemplate.attribute('server-modal-buttons', {
        'this-form': 'thisForm',
        'is-primary-button-disabled': 'false',
        'server-modal-controller': 'serverModalController'
      });
      $scope.thisForm = {};
      $scope.serverModalController = ctx.serverModalController;
      element = $compile(template)($scope);
      $scope.$digest();
      $elScope = element.isolateScope();
    });
  });
  describe('isBuilding', function () {
    it('should return false if both isLoading[name + isBuilding] and isLoading[name] are false', function () {
      $rootScope.isLoading.editServerModalisBuilding = false;
      $rootScope.isLoading.editServerModal = false;
      expect($elScope.isBuilding(), 'isBuilding').to.be.false;
    });
    it('should return true if isLoading[name + isBuilding] is true', function () {
      $rootScope.isLoading.editServerModalisBuilding = true;
      $rootScope.isLoading.editServerModal = false;
      expect($elScope.isBuilding(), 'isBuilding').to.be.true;
    });
    it('should return true if isLoading[name] is true', function () {
      $rootScope.isLoading.editServerModalisBuilding = false;
      $rootScope.isLoading.editServerModal = true;
      expect($elScope.isBuilding(), 'isBuilding').to.be.true;
    });
  });
  describe('createServerOrUpdate', function () {
    it('should return immidiately if primary button is disabled', function () {
      $elScope.isPrimaryButtonDisabled = sinon.stub().returns(true);
      $elScope.createServerOrUpdate();
      $scope.$digest();
      sinon.assert.notCalled(ctx.loadingMock);
    });
    describe('failures', function () {
      it('should fail safely', function () {
        var error = new Error('I am an error!');
        ctx.serverModalController.createServer.returns($q.reject(error));
        var resetStateContextVersionMock = sinon.spy();
        ctx.instance = null;
        ctx.cv = {
          id: 'hello'
        };
        ctx.serverModalController.state.contextVersion = ctx.cv;
        $scope.$on('resetStateContextVersion', resetStateContextVersionMock);

        $elScope.createServerOrUpdate();

        $scope.$digest();
        sinon.assert.callCount(ctx.loadingMock, 4);
        sinon.assert.calledWith(ctx.loadingMock.firstCall, 'editServerModalisBuilding', true);
        sinon.assert.calledWith(ctx.loadingMock.secondCall, 'editServerModal', true);

        sinon.assert.calledOnce(ctx.serverModalController.createServer);
        sinon.assert.notCalled(ctx.serverModalController.getUpdatePromise);

        sinon.assert.notCalled(ctx.serverModalController.changeTab);
        sinon.assert.notCalled(resetStateContextVersionMock);

        sinon.assert.calledWith(ctx.errsMock.handler, error);

        sinon.assert.calledWith(ctx.loadingMock.thirdCall, 'editServerModalisBuilding', false);
        sinon.assert.calledWith(ctx.loadingMock.lastCall, 'editServerModal', false);
        $scope.$digest();
      });
    });
    describe('when not disabled', function () {
      it('should attempt to create the server when no instance exists', function () {
        ctx.serverModalController.createServer.returns($q.when(true));
        var resetStateContextVersionMock = sinon.spy();
        ctx.instance = null;
        ctx.cv = {
          id: 'hello'
        };
        ctx.serverModalController.state.contextVersion = ctx.cv;
        $scope.$on('resetStateContextVersion', resetStateContextVersionMock);

        $elScope.createServerOrUpdate();

        $scope.$digest();
        sinon.assert.callCount(ctx.loadingMock, 4);
        sinon.assert.calledWith(ctx.loadingMock.firstCall, 'editServerModalisBuilding', true);
        sinon.assert.calledWith(ctx.loadingMock.secondCall, 'editServerModal', true);

        sinon.assert.calledOnce(ctx.serverModalController.createServer);
        sinon.assert.notCalled(ctx.serverModalController.getUpdatePromise);

        sinon.assert.calledOnce(ctx.serverModalController.changeTab);
        sinon.assert.calledWith(ctx.serverModalController.changeTab, 'logs');
        sinon.assert.calledOnce(resetStateContextVersionMock);
        sinon.assert.calledWith(resetStateContextVersionMock, sinon.match.object, ctx.cv, false);

        sinon.assert.calledWith(ctx.loadingMock.thirdCall, 'editServerModalisBuilding', false);
        sinon.assert.calledWith(ctx.loadingMock.lastCall, 'editServerModal', false);
        $scope.$digest();
      });
      it('should attempt to update the server when an instance exists', function () {
        ctx.serverModalController.getUpdatePromise.returns($q.when(true));
        var resetStateContextVersionMock = sinon.spy();
        ctx.instance = {
          id: 'hello'
        };
        ctx.serverModalController.instance = ctx.instance;
        $scope.$on('resetStateContextVersion', resetStateContextVersionMock);

        $elScope.createServerOrUpdate();

        $scope.$digest();
        sinon.assert.callCount(ctx.loadingMock, 4);
        sinon.assert.calledWith(ctx.loadingMock.firstCall, 'editServerModalisBuilding', true);
        sinon.assert.calledWith(ctx.loadingMock.secondCall, 'editServerModal', true);

        sinon.assert.notCalled(ctx.serverModalController.createServer);
        sinon.assert.calledOnce(ctx.serverModalController.getUpdatePromise);

        sinon.assert.calledOnce(ctx.serverModalController.changeTab);
        sinon.assert.calledWith(ctx.serverModalController.changeTab, 'logs');
        sinon.assert.calledOnce(resetStateContextVersionMock);
        sinon.assert.calledWith(resetStateContextVersionMock, sinon.match.object, ctx.cv, false);

        sinon.assert.calledWith(ctx.loadingMock.thirdCall, 'editServerModalisBuilding', false);
        sinon.assert.calledWith(ctx.loadingMock.lastCall, 'editServerModal', false);
        $scope.$digest();
      });
    });
  });
});