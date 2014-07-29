require('app')
  .controller('ControllerBuildNew', ControllerBuildNew);
/**
 * ControllerBuildNew
 * @constructor
 * @export
 * @ngInject
 */
function ControllerBuildNew(
  $scope,
  $stateParams,
  $state,
  user,
  async,
  extendDeep,
  SharedFilesCollection,
  keypather,
  fetcherBuild
) {
  var QueryAssist = $scope.UTIL.QueryAssist;
  var holdUntilAuth = $scope.UTIL.holdUntilAuth;
  var dataBuildNew = $scope.dataBuildNew =  {};
  var actions = dataBuildNew.actions = {};
  var data = dataBuildNew.data = {
    showBuildMenu: false,
    showExplorer: true
  };

  actions.discardChanges = function () {
  };

  actions.stateToBuildList = function () {
    var state = {
      userName: $stateParams.userName,
      projectName: $stateParams.projectName,
      branchName: $stateParams.branchName
    };
    $state.go('projects.buildList', state);
  };

  /* ============================
   *   API Fetch Methods
   * ===========================*/

  function fetchNewBuild(cb) {
    var environment = dataBuildNew.data.environment;
    new QueryAssist(environment, cb)
      .wrapFunc('fetchBuild')
      .query($stateParams.newBuildName)
      .cacheFetch(function (build, cached, cb) {
        dataBuildNew.data.newBuild = build;
        cb();
      })
      .resolve(function (err, build, cb) {
        cb();
      })
      .go();
  }

  function newFilesCollOpenFiles(cb) {
    //var version = dataBuildNew.data.version;
    var version = dataBuildNew.data.newBuild.contextVersions.models[0];
    data.newVersion = version;
    data.openFiles = new SharedFilesCollection(
      version.newFiles([], {
        noStore: true
      }),
      $scope
    );
    cb();
  }

  actions.seriesFetchAll = function () {
    async.series([
      fetcherBuild($scope.dataBuildNew.data),
      fetchNewBuild,
      newFilesCollOpenFiles
    ], function(){
      $scope.safeApply();
    });
  };
  actions.seriesFetchAll();

}
