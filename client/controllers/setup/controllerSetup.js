require('app')
  .controller('ControllerSetup', ControllerSetup);
/**
 * ControllerSetup
 * @param $scope
 * @constructor
 * @export
 * @ngInject
 */
function ControllerSetup(
  async,
  determineActiveAccount,
  $scope,
  $state,
  $stateParams,
  keypather,
  OpenItems,
  user,
  QueryAssist,
  $window
) {

  var dataSetup = $scope.dataSetup = {
    data: {},
    actions: {}
  };
  var data = dataSetup.data;

  dataSetup.actions.olarkShrink = function() {
    if (angular.isFunction($window.olark)) {
      $window.olark('api.box.shrink');
    }
  };

  data.openItems = new OpenItems();
  data.showExplorer = false;
  data.loading = false;

  // Redirect to /new if this build has already been built
  function fetchUser(cb) {
    new QueryAssist(user, cb)
      .wrapFunc('fetchUser')
      .query('me')
      .cacheFetch(function (user, cached, cb) {
        $scope.user = user;
        $scope.safeApply();
        cb();
      })
      .resolve(function (err, user, cb) {
        if (err) throw err;
        cb();
      })
      .go();
  }

  function fetchBuild(cb) {
    new QueryAssist($scope.user, cb)
      .wrapFunc('fetchBuild')
      .query($stateParams.buildId)
      .cacheFetch(function (build, cached, cb) {
        if (keypather.get(build, 'attrs.started')) {
          // this build has been built.
          // redirect to new?
          $state.go('instance.new', {
            userName: $scope.activeAccount.oauthId()
          });
          cb(new Error('build already built'));
        } else {
          $scope.build = build;
          $scope.safeApply();
          cb();
        }
      })
      .resolve(function (err, build, cb) {
        if (err) throw err;
        $scope.safeApply();
        cb();
      })
      .go();
  }

  async.waterfall([
    determineActiveAccount,
    function (activeAccount, cb) {
      $scope.activeAccount = activeAccount;
      $scope.safeApply();
      cb();
    },
    fetchUser,
    fetchBuild
  ]);

}
