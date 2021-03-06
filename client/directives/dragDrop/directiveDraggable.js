'use strict';

// This code taken from  http://blog.parkji.co.uk/2013/08/11/native-drag-and-drop-in-angularjs.html
require('app')
  .directive('draggable', draggable);
/**
 * @ngInject
 */
function draggable(
  keypather
) {
  return {
    restrict: 'A',
    link: function ($scope, element, attrs) {
      // this gives us the native JS object

      // The root folder and the dockerfile should not be movable
      if (($scope.isRootDir && element.hasClass('folder')) ||
          keypather.get($scope, 'fs.id()') === '/Dockerfile') {
        return;
      }

      var el = element[0];

      el.draggable = true;

      el.addEventListener(
        'dragstart',
        function (e) {
          if (e.stopPropagation) { e.stopPropagation(); }
          e.dataTransfer.effectAllowed = 'move';
          var model = ($scope.fs) ? $scope.fs : $scope.dir;
          var modelType = ($scope.fs) ? 'File' : 'Dir';
          // This will allow us to pass the model over the dataTransfer object to the drop cb
          e.dataTransfer.setData('modelId', model.id());
          e.dataTransfer.setData('modelName', model.attrs.name);
          e.dataTransfer.setData('modelType', modelType);

          e.dataTransfer.setData('oldPath', model.attrs.path);
          e.dataTransfer.setData('oldParentDirId', $scope.parentDir.id());
          this.classList.add('drag');
          return false;
        },
        false
      );

      el.addEventListener(
        'dragend',
        function (e) {
          this.classList.remove('drag');
          return false;
        },
        false
      );

    }
  };
}
