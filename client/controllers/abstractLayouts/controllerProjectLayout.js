var app  = require('app');
app.controller('ControllerProjectLayout', ControllerProjectLayout);
/**
 * ControllerProjectLayout
 * @constructor
 * @export
 * @ngInject
 */
function ControllerProjectLayout ($scope,
                                  async,
                                  $stateParams,
                                  user) {
  var dataProjectLayout = $scope.dataProjectLayout = {};

  dataProjectLayout.name = $scope.dataApp.state.params.name;

  async.waterfall([
    // temporary helper
    function tempHelper (cb) {
      if (user.id()) {
        cb();
      } else {
        //user.anonymous(function () { cb(); });
        user.login('runnableUser9', 'asdfasdf9', function () { cb(); });
      }
    },
    //-------
    function fetchProjects (cb) {
      var projects = user.fetchProjects({ownerUsername: 'runnableUser9'}, function (err, body) {
        if (err) {
          // error handling
          return cb(err);
        }
        cb(null, projects);
      });
    }
  ], function (err, projects) {
    if (err) return; // TODO error handling
    $scope.$apply(function () {
      dataProjectLayout.projects = projects;
    });
  });

  // dataHeader.togglePopover = function (popoverName, eventA) {
  //   if (dataHeader['show' + popoverName]) {
  //     eventA.stopPropagation();
  //     return;
  //   }
  //   dataHeader['show' + popoverName] = true;
  //   // prevent popover from minimizing when clicking inside popover
  //   var $elPopover = $(eventA.currentTarget).parent('li.btn').children('div.popover');
  //   $elPopover.off('click').on('click', function (eventC) {
  //     if ($(this).has($(eventC.target))) {
  //       eventC.stopPropagation();
  //     }
  //   });
  //   // setTimeout prevents callback registered below from firing for THIS click event
  //   // (we want it to fire on the next click instead)
  //   setTimeout(function () {
  //     $(window).one('click', function (eventB) {
  //       $scope.$apply(function () {
  //         dataHeader['show' + popoverName] = false;
  //       });
  //     });
  //   }, 1);
  // };
}