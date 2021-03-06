'use strict';

// injector-provided
var $rootScope;
var $scope;
var $compile;
var $document;
var $timeout;
var $templateCache;
var $elScope;
var $q;

var apiMocks = require('../../apiMocks/index');

function makeDefaultOptions () {
  return {
    data: {
    },
    actions: {
      save: sinon.spy(),
      cancel: sinon.spy()
    },
    currentModel: apiMocks.instances.building,
    stateModel: {},
    template: 'viewModalDeleteBox'
  };
}

/**
 * Things to test
 *
 * Generic modal creation
 * Test each action
 *
 */

describe('directiveModalManager'.bold.underline.blue, function () {
  var ctx;
  function injectSetupCompile() {
    angular.mock.module('app');
    angular.mock.inject(function (
      _$templateCache_,
      _$compile_,
      _$timeout_,
      _$document_,
      _$rootScope_,
      _$q_
    ) {
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
      $compile = _$compile_;
      $document = _$document_;
      $templateCache = _$templateCache_;
      $timeout = _$timeout_;
      $q = _$q_;
    });
    ctx = {};
    $scope.modalOpen = false;
    ctx.template = directiveTemplate.attribute('modal-manager', {
      'modal-open': 'modalOpen'
    });
    ctx.element = $compile(ctx.template)($scope);
    $scope.$digest();
    $elScope = ctx.element.isolateScope();
  }

  afterEach(function () {
    $rootScope.$emit('close-modal');
  });

  describe('Modal close/open states', function () {
    it('Should listen to the openModal event and open a modal', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      var openedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(openedModal).to.exist;
    });

    it('Should close the previous modal if one was already open and the open event is fired', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      var openedModal = ctx.element[0].querySelector('.modal-backdrop');
      openedModal.test = '123';

      $rootScope.$emit('open-modal', modalOptions);
      $timeout.flush();

      var newModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(newModal).to.not.equal(openedModal);

    });

    it('Should listen to the closeModal event and close the modal', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      var openedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(openedModal).to.exist;

      $rootScope.$emit('close-modal');
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
    });


    it('Should listen to the destroy scope and close the modal', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      var openedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(openedModal).to.exist;

      $elScope.$destroy();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
    });
  });

  describe('default actions', function () {
    it('close action should close the modal', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      $elScope.currentModalScope.defaultActions.close();
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
    });
    it('close action should close the modal with a callback', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      var callbackSpy = sinon.spy();
      $elScope.currentModalScope.defaultActions.close(callbackSpy);
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
      expect(callbackSpy.calledOnce).to.equal(true);
    });
    it('save action should trigger the save action and the callback', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      modalOptions.stateModel = {
        foo: 'bar'
      };
      $rootScope.$emit('open-modal', modalOptions);

      var myObj = {
        foo: 'baz'
      };
      var paths = ['foo'];
      var cbSpy = sinon.spy();
      $elScope.currentModalScope.defaultActions.save(myObj, paths, cbSpy);

      expect(modalOptions.actions.save.calledOnce).to.equal(true);
      expect(modalOptions.stateModel.foo).to.equal('baz');
      expect(cbSpy.calledOnce).to.equal(true);
    });
    it('save action should trigger the the callback', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      modalOptions.actions = {};
      modalOptions.stateModel = {
        foo: 'bar'
      };
      $rootScope.$emit('open-modal', modalOptions);

      var myObj = {
        foo: 'baz'
      };
      var paths = ['foo'];
      var cbSpy = sinon.spy();
      $elScope.currentModalScope.defaultActions.save(myObj, paths, cbSpy);

      expect(modalOptions.stateModel.foo).to.equal('baz');
      expect(cbSpy.calledOnce).to.equal(true);
    });

    it('cancel action should close the modal and trigger the cancel action', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      $rootScope.$emit('open-modal', modalOptions);

      $elScope.currentModalScope.defaultActions.cancel();
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
      expect(modalOptions.actions.cancel.calledOnce).to.equal(true);
    });

    it('cancel action should close the modal', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      modalOptions.actions = {};
      $rootScope.$emit('open-modal', modalOptions);

      $elScope.currentModalScope.defaultActions.cancel();
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
    });

    it('cancel action call the close handler if one exists', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      modalOptions.actions = {};
      $rootScope.$emit('open-modal', modalOptions);
      $scope.$digest();

      var closeHandler = sinon.stub().returns($q.when(true));
      $rootScope.$emit('set-close-modal-handler', closeHandler);

      $elScope.currentModalScope.defaultActions.cancel();
      $scope.$digest();
      sinon.assert.calledOnce(closeHandler);
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
    });

    it('should be able to unlisten to the close handler', function () {
      injectSetupCompile();
      var modalOptions = makeDefaultOptions();
      modalOptions.actions = {};
      $rootScope.$emit('open-modal', modalOptions);
      $scope.$digest();

      var closeHandler = sinon.stub().returns($q.when(true));
      $rootScope.$emit('set-close-modal-handler', closeHandler);
      $rootScope.$emit('reset-close-modal-handler');

      $elScope.currentModalScope.defaultActions.cancel();
      $scope.$digest();
      sinon.assert.notCalled(closeHandler);
      $timeout.flush();

      var closedModal = ctx.element[0].querySelector('.modal-backdrop');
      expect(closedModal).to.not.exist;
    });
  });

});
