'use strict';

require('app')
  .controller('DNSConfigurationController', DNSConfigurationController);

function DNSConfigurationController(
  loading,
  errs,
  promisify,
  getInstanceMaster,
  keypather,
  $scope,
  debounce
) {
  var DCC = this;
  DCC.instanceDependencyMap = {};

  var refreshDependencies = debounce(function () {
    loading('dns', true);
    DCC.filteredDependencies = [];
    promisify(DCC.instance, 'fetchDependencies')()
      .then(function (dependencies) {
        DCC.filteredDependencies = dependencies.models.filter(function (dep) {
          return !dep.instance.destroyed && keypather.get(dep.instance, 'contextVersion.getMainAppCodeVersion()');
        });

        DCC.filteredDependencies.forEach(function (dep) {
          dep.instance.on('destroy', handleDestroyedDepInstance);
        });
      })
      .catch(errs.handler)
      .finally(function () {
        loading('dns', false);
      });
    $scope.$applyAsync();
  }, 500, true);

  function handleDestroyedDepInstance() {
    DCC.filteredDependencies.forEach(function (dep) {
      dep.instance.off('destroy', handleDestroyedDepInstance);
    });
    refreshDependencies();
  }

  // Fetch dependencies
  refreshDependencies();
  DCC.instance.on('update', refreshDependencies);
  $scope.$on('$destroy', function () {
    DCC.instance.off('update', refreshDependencies);
  });


  DCC.editDependency = function (dep) {
    loading('dnsDepData', true);

    DCC.lastModifiedDNS = null;
    DCC.modifyingDNS = {
      current: dep,
      options: []
    };
    getInstanceMaster(dep.instance)
      .then(function (masterInstance) {
        DCC.modifyingDNS.options.push(masterInstance);
        DCC.modifyingDNS.options = DCC.modifyingDNS.options.concat(masterInstance.children.models);
        loading('dnsDepData', false);
      });
  };

  DCC.selectInstance = function (instance) {
    var dependency = DCC.modifyingDNS.current;
    dependency.instance = instance;
    DCC.modifyingDNS = {};
    DCC.lastModifiedDNS = dependency;

    promisify(dependency, 'update')({
      hostname:  instance.getElasticHostname(),
      instance: instance.attrs.shortHash
    })
      .catch(errs.handler);
  };
}