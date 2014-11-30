var dom = require('dom-events');

module.exports = function header() {

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
  });

  dom.on(putBtn, 'click', function() {
    show(putSection);
  });

  dom.on(connectionsBtn, 'click', function() {
    show(connectionsSection);
  });

  dom.on(settingsBtn, 'click', function() {
    show(settingsSection);
  });

};

