
var keyList = require('../../js/widgets/keylist')
var cm = require('../../js/widgets/cm')
var messages = require('../../js/messages')

exports.load = function() {

  messages.on('manage/editorUpdate', function(json) {
    cm.update(json.value)
  })

  messages.on('manage/keyListUpdate', function(json) {
    keyList.receive(json.value)
  })
}

exports.click = function(options) {

  messages.meta('dbname', 'usrdb')
  $('#' + options.id).show()
  keyList.request()
}











// var query = require('./widgets/query')
// var visualize = require('./visualize')

// var keyList = require('./widgets/keylist')

// var $panels = $('.panel')
// var $settings = $('#settings')
// var $selectOne = $('#selectOne')
// var $visualizations = $('#visualizations')

// $nav.on('click', 'input', function() {

//   if(this.id === 'allkeys') {

//     // some tabs want to use a different database
//     messages.meta('dbname', 'usrdb')

//     // hide and show different things for each tab
//     $panels.hide()
//   }
//   else if (this.id == 'nav-vis') {
//     messages.meta('dbname', 'usrdb')
//     $panels.hide()
//     $visualizations.show()
//   }
//   else if (this.id == 'nav-settings') {
//     messages.meta('dbname', 'sysdb')
//     $panels.hide()
//     $settings.show()
//   }
//   else if (this.id == 'nav-tag') {
//     messages.meta('dbname', 'sysdb')
//     $panels.hide()
//   }

//   keyList.request()
//   $selectOne.show()
// })

  // function applyMetaData(value) {

  //   if (value.path) {
  //     $('#pathtodb').text(value.path)
  //   }

  //   if (value.cert) {
  //     $('#cert').text(value.cert)
  //   }
  // }

  // socket.onmessage = function(message) {

  //   try { message = JSON.parse(message.data) } catch(ex) {}

  //   var response = message.response

  //   if (response === 'manage/editorUpdate') {
  //     cm.update(message.value)
  //   }
  //   else if (response === 'manage/keyListUpdate') {
  //     if (cm.editing()) {
  //       return
  //     }
  //     keyList.receive(message.value)
  //   }
  //   else if (response === 'metaUpdate') {
  //     applyMetaData(message.value)
  //   }
  //   else if (response === 'visualize/validatekey') {
  //     visualize.updateField(message.value)
  //   }
  //   else if (response === 'visualize/treemap') {
  //     visualize.treemap(message.value)
  //   }
  //   else if (response === 'visualize/stackedchart') {
  //     visualize.stackedchart(message.value)
  //   }
  //   else if (response === 'visualize/barchart') {
  //     visualize.barchart(message.value)
  //   }
  //   else if (response === 'visualize/fetch') {
  //     visualize.fetch(message.value)
  //   }
  // }
