'use strict';

require('app')
  .factory('fetchInstances', fetchInstances)
  .factory('fetchBuild', fetchBuild);

function fetchInstances(
  pFetchUser,
  promisify,
  keypather,
  hasKeypaths,
  errs,
  $stateParams,
  $q
) {
  var currentInstanceList;
  return function (opts) {
    if (!opts) {
      opts = {};
    }

    // Check how cache works with HelloRunnable
    // Consider querying against ModelStore

    if (!opts.githubUsername && currentInstanceList && opts.name) {
      var cachedInstance = currentInstanceList.find(hasKeypaths({
        'attrs.name': opts.name
      }));
      if (cachedInstance) {
        console.log('cache hit', cachedInstance);
        return $q.when(cachedInstance);
      }
    }

    return pFetchUser.then(function(user) {
      var pFetch = promisify(user, 'fetchInstances');
      opts.githubUsername = opts.githubUsername || $stateParams.userName;
      return pFetch(opts);
    }).then(function(results) {
      console.log('results', results);
      var instance;
      if (opts.name) {
        console.log('one instance');
        instance = keypather.get(results, 'models[0]');

        if (!keypather.get(instance, 'containers.models') || !instance.containers.models.length) {
          throw new Error('Instance has no containers');
        }
      } else {
        console.log('all of em');
        currentInstanceList = results;
        instance = results;
      }

      if (!instance) {
        throw new Error('Instance not found');
      }

      return instance;
    }).catch(errs.handler);
  };
}

function fetchBuild(
  errs,
  pFetchUser,
  promisify,
  $q
) {
  var builds = {};
  return function (buildId) {
    if (!buildId) {
      throw new Error('BuildId is required');
    }

    if (builds[buildId]) {
      return $q.when(builds[buildId]);
    }

    return pFetchUser.then(function(user) {
      var pFetch = promisify(user, 'fetchBuild');
      return pFetch(buildId);
    })
    .then(function(build) {
      builds[buildId] = build;
      return build;
    }).catch(errs.handler);
  };
}