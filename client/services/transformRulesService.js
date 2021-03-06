'use strict';

require('app')
  .factory('deleteTransformRule', deleteTransformRule)
  .factory('createTransformRule', createTransformRule)
  .factory('moveTransformRules', moveTransformRules)
  .factory('testRenameTransformRule', testRenameTransformRule)
  .factory('testReplaceTransformRule', testReplaceTransformRule)
  .factory('testAllTransformRules', testAllTransformRules)
  .factory('parseDiffResponse', parseDiffResponse)
  .factory('populateRulesWithWarningsAndDiffs', populateRulesWithWarningsAndDiffs);

function checkErrorCallback(reject, cb) {
  return function (err, res, body) {
    if (err) {
      return reject(err);
    }
    if (!body) {
      return reject(new Error('There was an error processing your transformation rules.'));
    }
    if (body.message) {
      return reject(new Error(body.message));
    }
    cb(res, body);
  };
}

function cleanJunkFromRule(rule) {
  return {
    action: rule.action,
    search: rule.search,
    replace: rule.replace,
    source: rule.source,
    dest: rule.dest
  };
}

function cleanJunkFromRules(rules) {
  return {
    exclude: rules.exclude,
    replace: rules.replace.map(cleanJunkFromRule),
    rename: rules.rename.map(cleanJunkFromRule)
  };
}
function parseDiffResponse(
  diffParse
) {
  return function (fullDiff) {
    var totalParse = diffParse(fullDiff);
    return totalParse.map(function (parsed) {
      var groupByLineNumbers = {};
      parsed.modifications.forEach(function (modification) {
        if (!groupByLineNumbers[modification.ln]) {
          groupByLineNumbers[modification.ln] = {
            additions: [],
            deletions: []
          };
        }
        if (modification.del) {
          groupByLineNumbers[modification.ln].deletions.push(modification);
        } else {
          groupByLineNumbers[modification.ln].additions.push(modification);
        }
      });
      parsed.changes = Object.keys(groupByLineNumbers).map(function (key) {
        return groupByLineNumbers[key];
      });
      if (parsed.to) {
        parsed.to = parsed.to.replace('+++ ', '');
      }
      parsed.from = parsed.from.replace('--- ', '');
      if (parsed.from === parsed.to) {
        delete parsed.to;
      }
      return parsed;
    });
  };
}

function createTransformRule(
  promisify
) {
  return function (appCodeVersionModel, rule) {
    var rules = appCodeVersionModel.attrs.transformRules || {};
    if (rule.action) {
      if (rule.oldRule) {
        rules[rule.action] = rules[rule.action].filter(function (needle) {
          return needle._id !== rule.oldRule._id;
        });
      }
      rules[rule.action].push(rule);
    } else {
      rules.exclude = rule;
    }

    return promisify(appCodeVersionModel, 'update')({
      transformRules: cleanJunkFromRules(rules)
    });

  };
}

function moveTransformRules(
  promisify
) {
  return function (appCodeVersionModel, newRules, action) {
    var rules = appCodeVersionModel.attrs.transformRules || {};
    rules[action] = newRules;

    return promisify(appCodeVersionModel, 'update')({
      transformRules: cleanJunkFromRules(rules)
    });

  };
}


function testAllTransformRules(
  $q,
  apiClientBridge
) {
  return function (appCodeVersionModel) {
    return $q(function (resolve, reject) {
      if (appCodeVersionModel) {
        apiClientBridge.client.post(appCodeVersionModel.urlPath + '/' + appCodeVersionModel.id() +
          '/actions/applyTransformRules',
          checkErrorCallback(reject, function callback(res, body) {
            resolve(body);
          }));
      } else {
        resolve();
      }
    });
  };
}

function testRenameTransformRule(
  $q,
  apiClientBridge
) {
  return function (appCodeVersionModel, rule) {
    return $q(function (resolve, reject) {
      rule.action = 'rename';
      apiClientBridge.client.post(appCodeVersionModel.urlPath + '/' + appCodeVersionModel.id() +
        '/actions/testTransformRule', {
          json: rule
        }, checkErrorCallback(reject, function callback(res, body) {
          resolve(body.nameChanges);
        }));
    });
  };
}

function reduceAndAddNewLine (diffs) {
  return function (total, key) {
    var endsInNewLine= diffs[key].match(/(\r\n|\n|\r)$/g) !== null;
    if (!endsInNewLine) {
      return total + diffs[key] + '\n';
    }
    return total + diffs[key];
  };
}

function testReplaceTransformRule(
  $q,
  parseDiffResponse,
  apiClientBridge
) {
  return function (appCodeVersionModel, rule) {
    return $q(function (resolve, reject) {
      rule.action = 'replace';
      apiClientBridge.client.post(appCodeVersionModel.urlPath + '/' + appCodeVersionModel.id() +
        '/actions/testTransformRule', {
          json: rule
        }, checkErrorCallback(reject, function callback(res, body) {
          if (body.diffs) {
            var combinedDiff = Object.keys(body.diffs).reduce(reduceAndAddNewLine(body.diffs), '');
            var parsed = parseDiffResponse(combinedDiff);
            resolve(parsed);
          } else {
            reject();
          }
        }));
    });
  };
}

function populateRulesWithWarningsAndDiffs(
  hasKeypaths,
  parseDiffResponse
) {
  return function (ruleList, transformResults) {
    if (Array.isArray(ruleList) && Array.isArray(transformResults)) {
      ruleList.forEach(function (replaceRule) {
        var found = transformResults.find(hasKeypaths({
          'rule._id': replaceRule._id
        }));
        if (found) {
          replaceRule.warnings = found.warnings;
          replaceRule.nameChanges = found.nameChanges;
          var combinedDiff = Object.keys(found.diffs).reduce(reduceAndAddNewLine(found.diffs), '');
          replaceRule.diffs = parseDiffResponse(combinedDiff);
        }
      });
    }
    return ruleList;
  };
}

function deleteTransformRule(
  $q,
  promisify
) {
  return function (appCodeVersionModel, rule) {
    var rules = appCodeVersionModel.attrs.transformRules;
    if (rules) {
      rules[rule.action] = rules[rule.action].filter(function (needle) {
        return needle._id !== rule._id;
      });

      return promisify(appCodeVersionModel, 'update')({
        transformRules: cleanJunkFromRules(rules)
      });
    }
    return $q.reject(new Error('No rules to delete'));
  };
}
