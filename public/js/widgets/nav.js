
var keyList = require('./keylist')
var messages = require('../messages')

var $panels = $('.panel')
var $settings = $('#settings')
var $selectOne = $('#selectOne')
var $visualizations = $('#visualizations')

$('nav.secondary input').on('click', function() {

  // some tabs want to use a different dataset

  if(this.id === 'nav-all') {
    messages.meta('dbname', 'usrdb')
    $panels.hide()
  }
  else if (this.id == 'nav-vis') {
    messages.meta('dbname', 'usrdb')
    $panels.hide()
    $visualizations.show()
  }
  else if (this.id == 'nav-settings') {
    messages.meta('dbname', 'sysdb')
    $panels.hide()
    $settings.show()
  }
  else if (this.id == 'nav-tag') {
    messages.meta('dbname', 'sysdb')
    $panels.hide()
  }

  keyList.request()
  $selectOne.show()
})
