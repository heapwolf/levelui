var dom = require('dom-events');

var root = '../';

var header = require(root + 'lib/header');
var query = require(root + 'lib/query');
var put = require(root + 'lib/put');
var settings = require(root + 'lib/settings');
var connections = require(root + 'lib/connections');

exports.init = function header() {

  var q = document.querySelector.bind(document);

  var queryBtn = q('header a.query');
  var putBtn = q('header a.put');
  var connectionsBtn = q('header a.connections');
  var settingsBtn = q('header a.settings');

  var querySection = q('section.query');
  var putSection = q('section.put');
  var connectionsSection = q('section.connections');
  var settingsSection = q('section.settings');

  querySection.style.display = 'block';
  putSection.style.display = 'none';
  connectionsSection.style.display = 'none';
  settingsSection.style.display = 'none';

  function show(el) {
    var selector = 'section[style*="display: block"]';
    document.querySelector(selector).style.display = 'none';
    el.style.display = 'block';
  }

  dom.on(queryBtn, 'click', function() {
    show(querySection);
    query.onShow();
  });

  dom.on(putBtn, 'click', function() {
    show(putSection);
    put.onShow();
  });

  dom.on(connectionsBtn, 'click', function() {
    show(connectionsSection);
    connections.onShow();
  });

  dom.on(settingsBtn, 'click', function() {
    show(settingsSection);
    settings.onShow();
  });

};

