'use strict';

require('app').controller('BuildLogsController', BuildLogsController);

function BuildLogsController(
  streamingLog,
  $scope,
  primus,
  errs,
  createDebugContainer,
  $rootScope,
  $timeout
) {
  var BLC = this;
  BLC.showDebug = false;

  function handleUpdate () {
    var status = BLC.instance.status();
    if (status === 'buildFailed') {
      BLC.buildStatus = 'failed';
      BLC.showDebug = true;
      BLC.buildLogsRunning = false;
    } else if (status === 'building') {
      BLC.buildStatus = 'running';
      BLC.buildLogsRunning = true;
      BLC.showDebug = false;
    } else {
      BLC.buildStatus = 'success';
      BLC.buildLogsRunning = false;
    }
  }

  var failCount = 0;
  var streamDelay = 500;

  function setupStream () {
    BLC.streamFailure = false;
    var stream = null;
    if (BLC.instance) {
      stream = primus.createBuildStream(BLC.instance.build);
      handleUpdate();
      BLC.instance.on('update', handleUpdate);
      $scope.$on('$destroy', function () {
        BLC.instance.off('update', handleUpdate);
      });
    } else if (BLC.debugContainer) {
      stream = primus.createBuildStreamFromContextVersionId(BLC.debugContainer.attrs.contextVersion);
    }

    stream.on('data', function () {
      stream.hasData = true;
    });

    stream.on('end', function () {
      if (!stream.hasData) {
        failCount++;
        if (failCount > 10) {
          BLC.streamFailure = true;
          BLC.buildLogsRunning = false;
        } else {
          streamDelay = Math.floor(streamDelay * 1.3);
          $timeout(function () {
            setupStream();
          }, streamDelay);
        }
      } else {
        BLC.buildLogsRunning = false;
      }
      $scope.$applyAsync();
    });
    stream.on('disconnection', function () {
      setupStream();
      $scope.$applyAsync();
    });
    var streamingBuildLogs = streamingLog(stream);
    $scope.$on('$destroy', function () {
      streamingBuildLogs.destroy();
    });
    BLC.buildLogs = streamingBuildLogs.logs;
    BLC.buildLogTiming = streamingBuildLogs.times;
  }

  BLC.getBuildLogs = function () {
    if (BLC.instance) {
     return BLC.buildLogs;
    } else if (BLC.debugContainer) {
      var newBuildLogs = [];
      for (var i=0; i<BLC.buildLogs.length; i++) {
        var command = BLC.buildLogs[i];
        newBuildLogs.push(command);
        if (command.imageId === BLC.debugContainer.attrs.layerId) {
          return newBuildLogs;
        }
      }
      return newBuildLogs;
    }
  };

  setupStream();

  this.generatingDebug = false;
  this.actions = {
    launchDebugContainer: function (event, command) {
      if (BLC.debugContainer) {
        return;
      }

      $rootScope.$emit('close-popovers');

      if (BLC.generatingDebug) {
        return;
      }
      var topBar = window.outerHeight - window.innerHeight;
      var padding = 60;
      var width = window.innerWidth - padding - padding;
      var height = window.innerHeight - padding - padding - 50;
      var top = window.screenTop + padding + topBar;
      var left = window.screenLeft + padding;
      var newWindow = window.open('/loading', 'page', 'toolbar=0,scrollbars=1,location=0,statusbar=0,menubar=0,resizable=0,width='+width+',height='+height+',left='+left+',top='+top+',titlebar=yes');
      event.stopPropagation();
      BLC.generatingDebug = true;
      createDebugContainer(BLC.instance.id(), BLC.instance.attrs.contextVersion._id, command.imageId, command.rawCommand)
        .then(function (debugContainer) {
          BLC.generatingDebug = false;
          if (newWindow) {
            newWindow.location = '/debug/'+debugContainer.id();
          }
        })
        .catch(function (err) {
          if(newWindow){
            newWindow.close();
          }
          BLC.generatingDebug = false;
          errs.handler(err);
        });
    }
  };
}


