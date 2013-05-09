var messages = require('../messages')
var query = require('./query')

var $keyList = $('#keyList')
var $controls = $('.control, #refresh')
var $selectedKeyCount = $('.selected-key-count')

var $noKeys = $('#noKeys')
var $selectOne = $('#selectOne')

var inputBounce
var keyList = exports

var keyTemplate = '<option value="{{key}}" title="{{key}}">{{key}}</option>'

currentSelection = ''

function getSelectedKeys() {
  var keys = []

  $keyList.find('option:selected').each(function(key){
    keys.push(this.value)
  })

  return keys
}

keyList.val = function() {
  return currentSelection
}

keyList.receive = function(value) {

  if (value) {

    var currentSelections = $keyList.val()

    $keyList.empty()
    $selectedKeyCount.text('')

    if (value.length > 0) {
      $noKeys.hide()
    }
    else {
      $noKeys.show()
    }

    value.forEach(function(key) {
      if (key)
      $keyList.append(keyTemplate.replace(/{{key}}/g, key))
    })

    $keyList.val(currentSelections)
    $keyList.trigger('change')
  }
}

keyList.request = function() {

  clearTimeout(inputBounce)
  inputBounce = setTimeout(function() {

    messages.emit('data', {
      request: 'manage/keyListUpdate', 
      value: {
        query: query.val()
      }
    })

  }, 16)
}

//
// when a user is trying to enter query criteria
//
$controls.on('keyup mouseup click', keyList.request)

//
// when a user selects a single item from the key list
//
$keyList.on('change', function() {

  var count = 0

  $keyList.find('option:selected').each(function(key) {
    count ++
  })

  if (count > 1) {

    $selectedKeyCount.text(count)
    $selectOne.show()
  }
  else if (count === 1) {

    $selectedKeyCount.text('')

    $selectOne.hide()
    currentSelection = this.value

    messages.emit('data', {
      request: 'manage/editorUpdate', 
      value: { key: this.value }
    })
  }
  else {
    $selectedKeyCount.text('')
    $selectOne.show()
  }
})


//
// when a user wants to delete one or more keys from the key list
//
$('#delete-keys').on('click', function() {

  var operations = []

  $keyList.find('option:selected').each(function(key){
    operations.push({ type: 'del', key: this.value })
  })

  messages.emit('data', {
    request: 'manage/deleteValues',
    value: { 
      operations: operations, 
      query: query.val() 
    }
  })

  $selectOne.show()
})


//
// when the user wants to tag the currently selected keys
//
$('#addto-tags').click(function() {

  messages.emit('data', {
    request: 'manage/tag',
    value: {
      keys: getSelectedKeys()
    }
  })
})
