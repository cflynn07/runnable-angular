'use strict';

var util = require('../helpers/util');

function ActivePanel (pageType, parent) {
  this.pageType = pageType;

  this.panel = util.createGetter(by.css('section.views'), parent);

  this.addTab = util.createGetter(by.css('.btn-add-tab'), this.panel);

  this.currentContent = util.createGetter(by.css('div.active-panel.ace-runnable-dark:not(.ng-hide)'), this.panel);

  this.openTabs = util.createGetter(by.repeater('item in openItems.models'), this.panel);

  this.ace = util.createGetter(by.css('div.active-panel.ng-scope.ace-runnable-dark'), this.panel);

  this.activeAceDiv = util.createGetter(by.css('.active-panel.ace-runnable-dark:not(.ng-hide) .ace_editor'), this.panel);

  this.activeTab = util.createGetter(by.css('.tabs > .active'), this.panel);

  this.isLoaded = function() {
    return this.currentContent.get().isPresent();
  };

  this.aceLoaded = function () {
    return this.ace.get().isPresent();
  };

  this.getActiveTab = function() {
    return this.activeTab.get().getText();
  };

  this.openTab = function (tabType) {
    this.addTab.get().click();
    element(by.cssContainingText('.popover-add-tab li', tabType), this.panel).click();
  };

  this.isActiveTabDirty = function () {
    return element.all(by.css('.tab-wrapper.active.dirty')).count() > 0;
  };

  this.setActiveTab = function (text) {
    var tab = element(by.cssContainingText('.tab-wrapper', text));
    util.hasClass(tab, 'active').then(function (isActive) {
      if (!isActive) {
        tab.click();
        browser.wait(function () {
          return util.hasClass(tab, 'active');
        });
      }
    });
  };

  // http://stackoverflow.com/q/25675973/1216976
  // https://github.com/angular/protractor/issues/1273
  this.writeToFile = function (contents) {
    var self = this;
    this._getAceDiv().then(function(elem) {
      browser.actions().click(elem).perform();
      return self._getInputElement(elem);
    }).then(function(elem) {
      return elem.sendKeys(contents);
    });
  };


  // http://stackoverflow.com/q/25675973/1216976
  // https://github.com/angular/protractor/issues/1273
  this.addToFile = function (contentToAdd) {
    var self = this;
    this._getAceDiv().then(function(elem) {
      browser.actions().click(elem).perform();
      return self._getInputElement(elem);
    }).then(function(elem) {
      elem.sendKeys(protractor.Key.ARROW_DOWN);
      return elem.sendKeys(contentToAdd + '\n');
    });
  };

  this.clearActiveFile = function () {
    var self = this;
    this._getAceDiv().then(function(elem) {
      browser.actions().click(elem).perform();
      return self._getInputElement(elem);
    }).then(function(elem) {
      var cmd = util.getOSCommandKey();
      elem.sendKeys(protractor.Key.chord(cmd, "a"));
      elem.sendKeys(protractor.Key.BACK_SPACE);
      return elem.clear();
    });
  };

  // With line numbers
  this.getContents = function () {
    return this.currentContent.get().getText();
  };

  // Gets the actual contents of the file (without Ace's line numbers, etc)
  this.getFileContents = function () {
    return this._getAceDiv().then(function (elem) {
      return elem.element(by.css('.ace_content')).getText();
    });
  };

  this.isClean = function () {
    return element(by.css('.box-header')).evaluate('data' + this.pageType + '.data.openItems.isClean()');
  };

  var activeIdx;
  this._getAceDiv = function () {
    // currently only works for file types
    var self = this;
    var idx = 0;
    activeIdx = 0;
    var aceDivs = this.activeAceDiv.get();
    return aceDivs;
  };

  this._getInputElement = function (elem) {
    if (!elem) {
      elem = this._getAceDiv().get();
    }
    // currently only works for file types
    return elem.element(by.css('textarea.ace_text-input'));
  };
}

module.exports = ActivePanel;
