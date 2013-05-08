
var keyList = require('./keylist')
var messages = require('../messages')

var $panels = $('.panel')
var $settings = $('#settings')
var $selectOne = $('#selectOne')
var $visualizations = $('#visualizations')

$('nav.secondary input').on('click', function() {

  if(this.id === 'nav-all') {

    // some tabs want to use a different database
    messages.meta('dbname', 'usrdb')

    // hide and show different things for each tab
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
