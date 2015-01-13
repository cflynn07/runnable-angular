'use strict';

require('app')
  .directive('modalGettingStarted', modalGettingStarted);
/**
 * directive modalGettingStarted
 * @ngInject
 */
function modalGettingStarted(
  $rootScope,
  $log,
  async,
  createDockerfileFromSource,
  errs,
  getNewForkName,
  fetchGSDepInstances,
  gsPopulateDockerfile,
  createNewInstance,
  $state,
  $stateParams,
  fetchUser,
  keypather,
  createNewBuild
) {
  return {
    restrict: 'E',
    templateUrl: 'viewModalGettingStarted',
    scope: {
      defaultActions: '='
    },
    link: function ($scope, element, attrs) {

      $scope.actions = {
        addDependency: function (instance) {
          var envs = keypather.get(instance, 'containers.models[0].urls()') || [];
          var newName = getNewForkName(instance, $rootScope.dataApp.data.instances, true);
          $scope.state.dependencies.push({
            instance: instance,
            opts: {
              name: newName,
              env: instance.attrs.env
            },
            reqEnv: envs.map(function (url, index) {
              return {
                name: instance.attrs.name.toUpperCase() + '_HOST' + (index > 0 ? index : ''),
                url: url.replace(instance.attrs.name, newName)
              };
            })
          });
        },
        removeDependency: function (model) {
          var index = $scope.state.dependencies.indexOf(model);
          $scope.state.dependencies.splice(index, 1);
        },
        createAndBuild: function() {
          // first thing to do is generate the dockerfile
          $rootScope.dataApp.data.loading = true;
          $scope.$watch('dockerfile', function (n) {
            if (n) {
              $scope.state.opts.env = generateEnvs($scope.state.dependencies);
              $scope.state.opts.name =
                getNewForkName({
                  attrs: {
                    name: $scope.state.selectedRepo.attrs.name
                  }
                }, $rootScope.dataApp.data.instances, true);
              $log.log('ENVS: \n' + $scope.state.opts.env);
              async.waterfall([
                createAppCodeVersions(
                  $scope.contextVersion,
                  $scope.state.selectedRepo,
                  $scope.state.activeBranch
                ),
                gsPopulateDockerfile(n, $scope.state),
                forkInstances($scope.state.dependencies),
                createNewInstance(
                  $rootScope.dataApp.data.activeAccount,
                  $scope.build,
                  $scope.state.opts,
                  $rootScope.dataApp.data.instances
                ),
                function () {
                  $state.go('instance.instance', {
                    userName: $stateParams.userName,
                    instanceName: $scope.state.opts.name
                  });
                }
              ], errs.handler);
            }
          });
        }
      };
      $scope.state = {
        unsavedAcvs: [],
        dependencies: [],
        opts: {
          name: 'NewInstance'
        },
        step: 1
      };
      fetchGSDepInstances(function (err, deps) {
        if (err) { return errs.handler(err); }
        keypather.set($scope, 'data.allDependencies', deps);
      });
      $scope.$watch('state.stack.name', function (n) {
        if (n) {
          createNewBuild($rootScope.dataApp.data.activeAccount, function (err, build, version) {
            $scope.build = build;
            $scope.contextVersion = version;
            createDockerfileFromSource(version, n, function (err, dockerfile) {
              if (err) {
                return errs.handler(err);
              }
              $scope.dockerfile = dockerfile;
            });
          });
        }
      });

      function generateEnvs(depModels) {
        var envList = [];
        depModels.forEach(function(item) {
          if (item.reqEnv) {
            item.reqEnv.forEach(function(env) {
              envList.push(env.name + '=' + env.url);
            });
          }
        });
        return envList;
      }

      function createAppCodeVersions(version, repo, branch) {
        return function (cb) {
          var latestCommit = branch.commits.models[0];
          version.appCodeVersions.create({
            repo: repo.attrs.full_name,
            branch: branch.attrs.name,
            commit: latestCommit.attrs.sha
          }, function (err) {
            cb(err);
          });
        };
      }

      function forkInstances(items) {
        //$rootScope.dataApp.data.loading = true;
        function fork(instance, opts, cb) {
          instance.copy(opts, cb);
        }

        return function (cb) {
          var parallelFunctions = items.map(function (item) {
            return function (cb) {
              if (item.opts) {
                fork(item.instance, item.opts, cb);
              } else {
                cb();
              }
            };
          });
          async.parallel(parallelFunctions, cb);
        };
      }
    }
  };
}