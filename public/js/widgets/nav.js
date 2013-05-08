
var keyList = require('./keylist')

var $panels = $('.panel')
var $settings = $('#settings')
var $selectOne = $('#selectOne')
var $visualizations = $('#visualizations')

$('nav.secondary input').on('click', function() {

  if(this.id === 'nav-all') {
    currentDatasource = 'usrdb'
    $panels.hide()
  }
  else if (this.id == 'nav-vis') {
    currentDatasource = 'usrdb'
    $panels.hide()
    $visualizations.show()
  }
  else if (this.id == 'nav-settings') {
    currentDatasource = 'sysdb'
    $panels.hide()
    $settings.show()
  }
  else if (this.id == 'nav-tag') {
    currentDatasource = 'sysdb'
    $panels.hide()
  }

  keyList.request()
  $selectOne.show()
})
