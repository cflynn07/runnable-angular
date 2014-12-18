describe('directiveAccountsSelect'.bold.underline.blue, function() {
  var element;
  var $scope, $elScope;
  var $rootScope;
  var ctx;
  var apiMocks = require('../apiMocks/index');

  function makeDefaultScope() {
    ctx.fakeuser = {
      attrs: angular.copy(apiMocks.user),
      oauthName: function () {
        return 'user';
      },
      gravitar: function () {
        return true;
      }
    };
    ctx.fakeOrg1 = {
      attrs: angular.copy(apiMocks.user),
      oauthName: function () {
        return 'org1';
      },
      gravitar: function () {
        return true;
      }
    };
    ctx.fakeOrg2 = {
      attrs: angular.copy(apiMocks.user),
      oauthName: function () {
        return 'org2';
      },
      gravitar: function () {
        return true;
      }
    };
    return {
      data: {
        activeAccount: ctx.fakeuser,
        orgs: {models: [ctx.fakeOrg1, ctx.fakeOrg2]},
        user: ctx.fakeuser
      }
    };
  }
  function initState (addToScope) {
    ctx = {};
    if (!addToScope) {
      addToScope = makeDefaultScope();
    }
    angular.mock.module('app');
    ctx.stateMock = {
      '$current': {
        name: 'instance.instanceEdit'
      },
      go: function () {}
    };
    angular.mock.module('app', function ($provide) {
      $provide.value('$state', ctx.stateMock);
      $provide.value('$stateParams', {
        userName: 'username',
        instanceName: 'instanceName'
      });
    });
    angular.mock.inject(function($compile, _$rootScope_, $timeout){
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();

      $rootScope.safeApply = function(cb) {
        $timeout(function () {
          $scope.$digest();
        });
      };

      var tpl = directiveTemplate('accounts-select', {
        'data': 'data'
      });

      Object.keys(addToScope).forEach(function (key) {
        $scope[key] = addToScope[key];
      });

      ctx.element = $compile(tpl)($scope);
      $scope.$digest();
    });
    $elScope = ctx.element.isolateScope();
  }

  describe('directive logic'.bold.blue, function() {
    it('should set isChangeAccount to false', function () {
      initState();
      $scope.$digest();
      expect($elScope.isChangeAccount).to.be.false;
      $elScope.isChangeAccount = true;
      $scope.$apply();
      $rootScope.$broadcast('app-document-click');
      expect($elScope.isChangeAccount).to.be.false;
    });
    it('should not emit signal and change state on when isChangeAccount to false', function () {
      initState();
      var instanceFetchSpy = sinon.spy();
      $rootScope.$on('INSTANCE_LIST_FETCH', instanceFetchSpy);
      $scope.$digest();
      expect($elScope.isChangeAccount).to.be.false;
      $elScope.selectActiveAccount(ctx.fakeOrg1);
      $scope.$apply();
      sinon.assert.notCalled(instanceFetchSpy);
    });
    it('should emit signal and change state on account change', function (done) {
      initState();
      ctx.stateMock.go = sinon.spy(function (location, state) {
        expect(state).to.deep.equal({
          userName: ctx.fakeOrg1.oauthName(),
          instanceName: ''
        });
        done();
      });
      var instanceFetchSpy = sinon.spy(function (event, username) {
        expect(username).to.equal(ctx.fakeOrg1.oauthName());
      });
      $rootScope.$on('INSTANCE_LIST_FETCH', instanceFetchSpy);
      $elScope.isChangeAccount = true;
      $scope.$digest();
      $elScope.selectActiveAccount(ctx.fakeOrg1);
      $scope.$apply();
      expect($scope.data.activeAccount).to.equal(ctx.fakeOrg1);
    });
  });

  describe('directive logic'.bold.blue, function() {
    afterEach(function() {
      $rootScope.$destroy();
    });
    it('should display with an active account', function () {
      initState();
      $scope.$digest();
      expect(ctx.element[0].classList.contains('ng-hide')).to.not.be.ok;
      expect(getAccountsGroupItemsList().length).to.equal(3);
      expect(getAccountSelectorElement().classList.contains('in')).to.not.be.ok;
    });
    it('shouldn\'t display without an active account', function () {
      var scope = makeDefaultScope();
      delete scope.data.activeAccount;
      initState(scope);
      $scope.$digest();
      expect(ctx.element[0].firstChild.classList.contains('ng-hide')).to.be.ok;
    });
    it('should display selector after click', function () {
      initState();
      $rootScope.$digest();
      click(getAccountSelectorElement());
      $rootScope.$digest();
      expect(getAccountSelectorElement().classList.contains('in')).to.be.ok;
      expect(getAccountsGroupItemsList().length).to.equal(3);
      click(getAccountSelectorElement());
      $scope.$digest();
      expect(getAccountSelectorElement().classList.contains('in')).to.not.be.ok;
    });
    it('should be able to select one of the selectors to change the account', function () {
      initState();
      $elScope.selectActiveAccount = sinon.spy();
      $rootScope.$digest();
      click(getAccountSelectorElement());
      $rootScope.$digest();
      expect(getAccountSelectorElement().classList.contains('in')).to.be.ok;
      expect(getAccountsGroupItemsList().length).to.equal(3);
      click(getAccountsGroupItemsList()[1]);
      $scope.$digest();
      sinon.assert.calledWith($elScope.selectActiveAccount, ctx.fakeOrg1);
    });
  });

  function getAccountSelectorElement() {
    return ctx.element[0]
      .querySelector('ol.accounts-group');
  }
  function getAccountsGroupItemsList() {
    return ctx.element[0]
      .querySelectorAll('li.accounts-group-item');
  }
});

function click(el){
  var ev = document.createEvent('MouseEvent');
  ev.initMouseEvent(
    'click',
    true /* bubble */, true /* cancelable */,
    window, null,
    0, 0, 0, 0, /* coordinates */
    false, false, false, false, /* modifier keys */
    0 /*left*/, null
  );
  el.dispatchEvent(ev);
}