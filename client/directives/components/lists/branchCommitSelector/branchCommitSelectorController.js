'use strict';

require('app')
  .controller('BranchCommitSelectorController', BranchCommitSelectorController);

function BranchCommitSelectorController(
  $scope,
  eventTracking,
  keypather
) {
  var BCSC = this;
  BCSC.isLatestCommitDeployed = true;

  BCSC.onCommitFetch = function (commits) {
    if (!commits.models.length) { return; }
    if (BCSC.data.commit) {
      BCSC.data.commit = commits.models.find(function (otherCommits) {
        return otherCommits === BCSC.data.commit;
      }) || commits.models[0];
      BCSC.isLatestCommitDeployed = commits.models[0] === BCSC.data.commit;
    }
  };

  BCSC.isLatestCommit = function (setToLatestCommit) {
    if (arguments.length) {
      BCSC.data.commit = keypather.get(BCSC.data.branch, 'commits.models[0]');
      BCSC.data.useLatest = setToLatestCommit;
      if (setToLatestCommit) {
        $scope.$emit('commit::selected', BCSC.data.commit);
      }
    } else {
      return BCSC.data.useLatest;
    }
  };

  BCSC.selectCommit = function (commit) {
    if (BCSC.isAutoDeployOn() || BCSC.isLatestCommit()) { return; }
    BCSC.data.commit = commit;
    eventTracking.selectCommit(BCSC.isLatestCommit());
    $scope.$emit('commit::selected', commit);
  };

  BCSC.deployLatestCommit = function () {
    if (BCSC.isAutoDeployOn() && !BCSC.isLatestCommitDeployed) {
      BCSC.data.commit = keypather.get(BCSC.data.branch, 'commits.models[0]');
      BCSC.updateInstance();
    }
  };

  BCSC.isAutoDeployOn = function () {
    if (keypather.get(BCSC, 'data.acv.attrs.additionalRepo')) {
      return BCSC.data.useLatest;
    }
    return !keypather.get(BCSC.data, 'locked');
  };

  BCSC.autoDeploy = function (isAutoDeployOn) {
    if (angular.isDefined(isAutoDeployOn)) {
      BCSC.data.locked = !isAutoDeployOn;
    }
    eventTracking.autoDeployToggled(BCSC.isAutoDeployOn());
    return BCSC.isAutoDeployOn();
  };

}
