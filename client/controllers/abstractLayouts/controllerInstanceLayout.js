require('app')
  .controller('ControllerInstanceLayout', ControllerInstanceLayout);
/**
 * @ngInject
 */
function ControllerInstanceLayout(
  $scope,
  async,
  $state,
  $stateParams,
  user,
  keypather,
  callbackCount,
  hasKeypaths
){
  var QueryAssist = $scope.UTIL.QueryAssist;
  var holdUntilAuth = $scope.UTIL.holdUntilAuth;
  var self = ControllerInstanceLayout;
  var dataInstanceLayout = $scope.dataInstanceLayout = {};
  var data = dataInstanceLayout.data = {};
  var actions = dataInstanceLayout.actions = {};

  holdUntilAuth(function () {
    if (keypather.get($scope.dataApp.user, 'attrs.accounts.github.username') === 'cflynn07') {
      var utterance = new window.SpeechSynthesisUtterance("I'm afraid I can't let you do that, Casey.");
      var voice = window.speechSynthesis.getVoices().find(function (v) { return (v.lang === 'en-GB'); });
      if (voice) {
        utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
      setTimeout(function () {
        window.location.href = 'http://www2.warnerbros.com/spacejam/movie/jam.htm';
      }, 6000);
      return;
    }
  });

  /**
   * Triggered when click instance in list on left panel
   */
  actions.stateToInstance = function (instance) {
    if (instance && instance.id && instance.id()){
      $state.go('instance.instance', {
        shortHash: instance.id(),
        userName: $state.params.userName
      });
    }
  };

  /**
   * user clicks on user / org in dropdown
   */
  actions.stateToAccount = function (userOrOrg) {
    // need to look up user/org's instances first
    // to navigate to 1st instance for user/org.
    // This query should be cached via fetchInstances
    // helper method on page load
    function changeState (shortHash) {
      $state.go('instance.instance', {
        shortHash: shortHash,
        userName: userOrOrg.oauthId()
      });
    }
    new QueryAssist($scope.dataApp.user, angular.noop)
      .wrapFunc('fetchInstances')
      .query({
        owner: {
          github: userOrOrg.oauthId()
        }
      })
      .cacheFetch(function updateDom(instances, cached, cb) {
        if (instances.models.length === 0){
          throw new Error('TODO: determine action if 0 instances');
        }
        // will only be invoked once via QueryAssist
        changeState(instances.models[0].attrs.shortHash);
        $scope.safeApply();
        cb();
      })
      .resolve(function (err, projects, cb) {
        $scope.safeApply();
        cb();
      })
      .go();
  };

  /**
   * Fetches a hash of classes for each instance displayed
   * in ng-repeat
   */
  actions.getInstanceClasses = function (instance) {
    var container = keypather.get(instance, 'containers.models[0]');
    var build = keypather.get(instance, 'build');
    var h = {};
    h.active = (instance.attrs.shortHash === $scope.dataApp.stateParams.shortHash);
    h.running = container && container.running();
    h.stopped = !h.running;
    h.building = build && !build.attrs.completed;
    h.failed = build && build.failed();
    return h;
  };

/*
  actions.selectProjectOwner = function (userOrOrg, cb) {
    var name = actions.getEntityName(userOrOrg);
    data.activeAccount = userOrOrg;
    data.showChangeAccount = false;

    if (cb) {
      return cb();
    }

    fetchInstances(function (err) {
      if (err) {
        return $state.go('404');
      }
      if (name === $state.params.userName || $scope.dataApp.state.current.name === 'projects') {
        // First fetch for the page or we're on /new
        return;
      }
      if (!data.activeAccount.attrs.projects.models.length) {
        // new project
        return $state.go('projects', {});
      }
      data.activeProject = data.activeAccount.attrs.projects.models[0];
      $state.go('box.boxInstance', {
        userName: name,
        shortHash: data.activeProject.id()
      });
    });
  };

  actions.getInClass = function () {
    return ($state.current.name === 'projects') ? 'in' : '';
  };

  actions.getProjectBuildListHref = function (projectName) {
    return '/' + $state.params.userName + '/' + projectName + '/master/';
  };

  actions.getProjectLiClass = function (project) {
    return (project.attrs.name === $state.params.projectName) ? 'active' : '';
  };

  actions.createNewProject = function () {
    if (dataInstanceLayout.data.newProjectNameForm.$invalid) {
      return;
    }
    var thisUser = $scope.dataApp.user;
    var body;
    $scope.dataApp.data.loading = true;
    data.creatingProject = true;

    function createProject(cb) {
      body = {
        name: dataInstanceLayout.data.newProjectName,
        owner: {
          github: data.activeAccount.oauthId()
        }
      };
      var project = thisUser.createProject(body, function (err) {
        $scope.dataApp.data.loading = false;
        data.creatingProject = false;
        if (err) {
          data.newNameTaken = true;
          throw err;
        }
        cb(err, thisUser, project);
      });
    }

    function createBuildAndContext(thisUser, project, cb) {
      var count = callbackCount(2, done);
      var build = project.defaultEnvironment.createBuild(count.next);
      var context = thisUser.createContext(body, count.next);

      function done(err) {
        if (err) {
          throw err;
        }
        cb(err, thisUser, project, build, context);
      }
    }

    function createContextVersion(thisUser, project, build, context, cb) {
      var opts = {};
      opts.json = {
        environment: project.defaultEnvironment.id(),
      };
      opts.qs = {
        toBuild: build.id()
      };
      var contextVersion = context.createVersion(opts, function (err) {
        cb(err, thisUser, project, build, context, contextVersion);
      });
    }
    async.waterfall([
      holdUntilAuth,
      createProject,
      createBuildAndContext,
      createContextVersion
    ], function (err, thisUser, project, build) {
      data.activeProject = project;
      $state.go('projects.setup', {
        userName: data.activeAccount.oauthName(),
        projectName: project.attrs.name
      });
    });
  };

  actions.stateToNewProject = function (userOrOrg) {
    actions.selectProjectOwner(userOrOrg, function () {
      $state.go('projects');
    });
  };

  actions.setActiveProject = function (userOrOrg, project) {
    data.activeProject = project;
    data.showChangeAccount = false;

    var finish = function () {
      var state = {
        userName: userOrOrg.oauthName(),
        shortHash: project.id()
      };
      setInitialActiveProject(function() {
        $state.go('instance.instance', state);
      });
    };

    if (userOrOrg !== data.activeAccount) {
      return async.series([
        function (cb) {
          actions.selectProjectOwner(userOrOrg, cb);
        },
        fetchInstances
      ], finish);
    }
    finish();
  };

  /*
  actions.getActiveProjectName = function() {
    if ($scope.dataApp.state.current.name === 'projects') {
      return actions.getEntityName(data.activeAccount);
    }
    if (data.activeProject) {
      // Useful when we've set a new project but haven't updated $state
      return data.activeProject.attrs.name;
    }

    if ($state.params.projectName) {
      return $state.params.projectName;
    } else if (data.instances) {
      var activeInstance = data.instances.find(function (instance) {
        return instance.id() === $state.params.instanceId;
      });
      if (activeInstance) {
        return activeInstance.attrs.project.name;
      }
      return '';
    }
  };
  */

  /* ============================
   *   API Fetch Methods
   * ===========================*/
  function fetchOrgs(cb) {
    var thisUser = $scope.dataApp.user;
    data.orgs = thisUser.fetchGithubOrgs(function (err) {
      $scope.safeApply();
      cb(err);
    });
  }

  function setActiveAccount (cb) {
    var currentUserOrOrgName = $state.params.userName;

    if (!currentUserOrOrgName || currentUserOrOrgName === $scope.dataApp.user.oauthName()) {
      data.activeAccount = $scope.dataApp.user;
      return cb();
    }
    var currentOrg = data.orgs.find(hasKeypaths({
      'attrs.login.toLowerCase()': currentUserOrOrgName.toLowerCase()
    }));
    if (currentOrg) {
      data.activeAccount = currentOrg;
      return cb();
    }
    return cb(new Error('User or Org not found'));
  }

  function fetchInstances(cb) {
    var thisUser = $scope.dataApp.user;
    new QueryAssist(thisUser, cb)
      .wrapFunc('fetchInstances')
      .query({
        owner: {
          github: data.activeAccount.oauthId()
        }
      })
      .cacheFetch(function updateDom(instances, cached, cb) {
        dataInstanceLayout.data.instances = instances;
        $scope.safeApply();
        cb();
      })
      .resolve(function (err, projects, cb) {
        $scope.safeApply();
        cb();
      })
      .go();

    // for caching, fetch instances of all other orgs
    async.map(data.orgs, function (org, cb) {
      thisUser.fetchInstances({
        owner: {
          github: org.oauthId()
        }
      }, function () {
        cb(null);
      });
    });
  }

  function setInitialActiveProject (cb) {
    var projectName = actions.getActiveProjectName();
    data.activeProject = data.activeAccount.attrs.projects.find(function (project) {
      return project.attrs.name === projectName;
    });
    data.projectInstances = data.instances.filter(function (instance) {
      return keypather.get(instance, 'attrs.project.name') === projectName;
    });
    cb();
  }

  /**
   * All pages besides new project page
   */
  actions.initForState = function () {
    async.waterfall([
      holdUntilAuth,
      fetchOrgs,
      setActiveAccount,
      fetchInstances
    ], function (err) {
      if (err) {
        $state.go('404');
        throw err;
      }
      $scope.safeApply();
    });
  };

  /**
   * New project page
   */
  actions.initForNewState = function () {
    async.waterfall([
      holdUntilAuth,
      fetchOrgs
    ]);
  };

  $scope.$watch('dataApp.state.current.name', function (newval, oldval) {
    if (newval.indexOf('instance.') === 0) {
      actions.initForState();
    } else if (newval === 'instance') {
      actions.initForNewState();
    }
  });

  $scope.$on('app-document-click', function () {
    $scope.dataInstanceLayout.data.showChangeAccount = false;
  });

}
