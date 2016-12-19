'use strict';

var featureFlags;
var mockOrg;
var $rootScope;

describe('demoFlowService'.bold.underline.blue, function () {
  var demoFlowService;
  function initState () {
    angular.mock.module('app');
    angular.mock.module(function($provide) {
      $provide.value('currentOrg', mockOrg);
      $provide.factory('featureFlags', function () {
        return {
          flags: featureFlags
        };
      });
    });
    angular.mock.inject(function (
      _demoFlowService_,
      _$rootScope_
      ) {
      $rootScope = _$rootScope_;
      demoFlowService = _demoFlowService_;
    });
    $rootScope.featureFlags = featureFlags;
  }
  beforeEach(function() {
    mockOrg = {
      isPersonalAccount: sinon.stub().returns(true),
      poppa: {
        attrs: {
          metadata: {
            hasAha: false,
            hasCompletedDemo: true
          }
        }
      }
    };
    featureFlags = {
      teamCTA: true
    };
  });
  describe('#shouldShowTeamCTA', function () {
    it('should return false if flag is off', function() {
      featureFlags.teamCTA = false;
      initState();
      var result = demoFlowService.shouldShowTeamCTA();
      expect(result).to.equal(false);
    });

    it('should return false if the current org is not a personal account', function() {
      mockOrg.isPersonalAccount.returns(false);
      initState();
      var result = demoFlowService.shouldShowTeamCTA();
      expect(result).to.equal(false);
    });

    it('should return false if the current org has not completed the demo', function() {
      mockOrg.poppa.attrs.metadata.hasAha = true;
      mockOrg.poppa.attrs.metadata.hasCompletedDemo = false;
      initState();
      var result = demoFlowService.shouldShowTeamCTA();
      expect(result).to.equal(false);
    });

    it('should return true if the current org is a peronal account and has completed the demo flow', function() {
      initState();
      var result = demoFlowService.shouldShowTeamCTA();
      expect(result).to.equal(true);
    });
  });
});