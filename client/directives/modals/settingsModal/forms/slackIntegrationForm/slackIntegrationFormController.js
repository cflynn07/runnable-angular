'use strict';

require('app')
  .controller('SlackIntegrationFormController', SlackIntegrationFormController);

/**
 * @ngInject
 */
function SlackIntegrationFormController (
  $scope,
  verifyChatIntegration,
  keypather,
  fetchSettings,
  debounce,
  errs,
  promisify,
  $q
) {
  var SIFC = this;
  angular.extend(SIFC, {
    verified: false,
    verifying: false,
    settings: {},
    ghMembers: [],
    slackMembers: [],
  });

  SIFC.showSlack = true;
  SIFC.settings = {};
  SIFC.slackMembers = {};
  SIFC.settingsFetched = false;
  SIFC.verified = false;
  SIFC.slackApiToken = null;
  SIFC.invalidApiToken = false;

  function fetchChatMemberData() {
    SIFC.invalidApiToken = false;
    return verifyChatIntegration(SIFC.slackApiToken, SIFC.settings, 'slack')
      .then(function (members) {
        keypather.set(SIFC, 'settings.attrs.notifications.slack.apiToken', SIFC.slackApiToken);
        SIFC.slackMembers = members.slack;
        SIFC.ghMembers = members.github;
        SIFC.verified = true;
        SIFC.invalidApiToken = false;
      })
      .catch(function (err) {
        SIFC.invalidApiToken = true;
        SIFC.verified = false;
        SIFC.slackMembers = {};
        SIFC.ghMembers = {};
        return $q.reject(err);
      });
  }

  fetchSettings()
    .then(function (settings) {
      SIFC.settings = settings;
      SIFC.slackApiToken = keypather.get(SIFC, 'settings.attrs.notifications.slack.apiToken');
      if ( SIFC.slackApiToken &&
          keypather.get(SIFC, 'settings.attrs.notifications.slack.githubUsernameToSlackIdMap')) {
        SIFC.showSlack = true;
        SIFC.loading = true;
        return fetchChatMemberData();
      }
    })
    .catch(errs.handler)
    .finally(function () {
      SIFC.loading = false;
      SIFC.settingsFetched = true;
    });

  SIFC.verifySlack = function () {
    SIFC.verifying = true;
    return fetchChatMemberData()
      .then(function () {
        SIFC.verified = true;
      })
      .catch(errs.handler)
      .finally(function () {
        SIFC.verifying = false;
      });
  };

  SIFC.deleteAPIToken = function () {
    SIFC.verified = false;
    SIFC.verifying = true;
    var slackData = {
      // I would have used `null`, but API complains
      apiToken: '',
      enabled: SIFC.settings.attrs.notifications.slack.enabled
    };
    SIFC.updateSlackSettings(slackData)
      .catch(errs.handler)
      .finally(function () {
        SIFC.verifying = false;
      });
  };

  SIFC.saveSlack = debounce(function () {
    var slackData = {
      apiToken: SIFC.settings.attrs.notifications.slack.apiToken,
      enabled: SIFC.settings.attrs.notifications.slack.enabled
    };
    slackData.githubUsernameToSlackIdMap = SIFC.slackMembers.reduce(function (obj, slackMember) {
      if (slackMember.ghName && !slackMember.found && /*keep calm and*/ slackMember.slackOn) {
        // Name was selected from the dropdown
        obj[slackMember.ghName] = slackMember.id;
      } else if (slackMember.found && slackMember.slackOn) {
        // Autodetected name was checked
        obj[slackMember.ghName] = slackMember.id;
      } else if (slackMember.ghName) {
        // We want to note them but not enable slack
        obj[slackMember.ghName] = null;
      }
      return obj;
    }, {});
    SIFC.updateSlackSettings(slackData)
      .catch(errs.handler);
  }, 250);

  SIFC.updateSlackSettings = function (slackSettingsObject) {
    return promisify(SIFC.settings, 'update')({
      json: {
        notifications: {
          slack: slackSettingsObject
        }
      }
    });
  };
}


