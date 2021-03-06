'use strict';

require('app')
  .factory('createDebugContainer', createDebugContainer);

function createDebugContainer(
  fetchUser,
  promisify
) {
  return function (instanceId, contextVersionId, layerId, rawCommand) {
    return fetchUser().then(function (user) {
      return promisify(user, 'createDebugContainer')({
        instance: instanceId,
        contextVersion: contextVersionId,
        layerId: layerId,
        cmd: rawCommand
      });
    });
  };
}
