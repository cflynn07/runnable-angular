'use strict';

require('app')
  .controller('RepositoryDetailsModalController', RepositoryDetailsModalController);
/**
 * controller RepositoryDetailsModalController
 * @ngInject
 */
function RepositoryDetailsModalController(
  fetchCommitData,
  loading,
  updateInstanceWithNewAcvData,

  acv,
  instance,
  close
) {
  var RDMC = this;
  RDMC.appCodeVersion = acv;
  RDMC.instance = instance;
  RDMC.close = close;


  RDMC.data = {
    repo: RDMC.appCodeVersion.githubRepo,
    acv: RDMC.appCodeVersion,
    branch: fetchCommitData.activeBranch(RDMC.appCodeVersion),
    commit: fetchCommitData.activeCommit(RDMC.appCodeVersion),
    useLatest: RDMC.appCodeVersion.attrs.useLatest,
    instance: RDMC.instance
  };
  RDMC.updateInstance = function () {
    loading('main', true);
    RDMC.close(
      updateInstanceWithNewAcvData(RDMC.instance, RDMC.appCodeVersion, RDMC.data)
        .finally(function () {
          loading('main', false);
        })
    );
  };
}
