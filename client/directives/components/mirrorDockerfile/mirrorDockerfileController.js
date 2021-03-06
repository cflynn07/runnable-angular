'use strict';

require('app')
  .controller('MirrorDockerfileController', MirrorDockerfileController);

function MirrorDockerfileController(
  $q,
  $rootScope,
  errs,
  doesDockerfileExist,
  fetchRepoDockerfile,
  fetchRepoDockerfiles,
  keypather
) {
  var MDC = this;
  if (!MDC.repo) {
    throw new Error('A repo is required for this controller');
  }

  MDC.resetDockerfilePaths = function () {
    MDC.newDockerfilePaths = [];
    MDC.newDockerComposeFilePaths = [];
    delete MDC.state.dockerfile;
    delete MDC.state.dockerComposeFile;
  };

  var oauthName = keypather.get($rootScope, 'dataApp.data.activeAccount.oauthName()');
  var name = keypather.get(MDC.repo, 'attrs.name');
  MDC.getFullRepo = function() {
    return keypather.get(MDC.repo, 'attrs.full_name') || (oauthName + '/' + name);
  };
  MDC.branchName = MDC.branchName || keypather.get(MDC.repo, 'attrs.default_branch');
  MDC.state.configurationMethod = null;

  MDC.loadDefaultDockerfile = function  (repo, branchName, filePath, fileType) {
    return fetchRepoDockerfile(repo, branchName, filePath)
      .then(doesDockerfileExist)
      .then(function (dockerfile) {
        if (!dockerfile) {
          return $q.reject('file doesn’t exist');
        }
        if (fileType === 'Dockerfile') {
          MDC.state.dockerComposeFile = null;
          MDC.state.dockerfile = dockerfile;
        } else if (fileType === 'Docker Compose') {
          MDC.state.dockerComposeFile = dockerfile;
          MDC.state.dockerfile = null;
        }
      });
  };

  MDC.isSaving = function () {
    return $rootScope.isLoading.newContainerSingleRepo || $rootScope.isLoading.creatingDockerCompose;
  };
}

