var util = require('../helpers/util');

function ActivePanel () {
  this.activePanel = util.createGetter(by.css('#wrapper > main > section.views.with-add-tab.ng-scope > div.active-panel.ng-scope.loaded.ace-runnable-dark'));

  this.ace = util.createGetter(by.css('#wrapper > main > section.views.ng-scope > div.active-panel.ng-scope.loaded.ace-runnable-dark > pre > div.ace_scroller > div'));
  this.aceDiv = util.createGetter(by.css('div.ace_content'));
  this.inputElm = util.createGetter(by.css('textarea.ace_text-input'));

  this.activeTab = util.createGetter(by.css('#wrapper > main > section.views.with-add-tab.ng-scope > div.views-toolbar.ng-isolate-scope > ul > li.tab-wrapper.ng-scope.active > span'));

  this.aceLoaded = function () {
    return this.ace.get().isPresent();
  };

  this.getActiveTab = function() {
    return this.activeTab.get().getText();
  };

  // http://stackoverflow.com/q/25675973/1216976
  // https://github.com/angular/protractor/issues/1273
  this.writeToFile = function (contents) {
    console.log('contents', contents);
    browser.actions().doubleClick(this.aceDiv.get()).perform();
    return this.inputElm.get().sendKeys(contents);
  };

  this.clearActiveFile = function () {
    // testola
    browser.actions().doubleClick(this.aceDiv.get()).perform();
    return this.inputElm.get().clear();
  };

  this.getFileContents = function() {
    return this.ace.get().getText();
  };

  this.fileIsClean = function () {
    return element(by.css('.box-header')).evaluate('dataSetup.data.openItems.isClean()');
  };
}

module.exports = ActivePanel;


/**
 * Set active tab
 *  - sets it in memory
 *  - clicks
 *  - getter gets all stuff but filters
 * 
 */