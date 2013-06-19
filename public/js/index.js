var multilevel = require('multilevel')
var injectStream = require('reconnect/inject')
var engine = require('engine.io-stream')
var insertcss = require('insert-css')
var db = require('./db')

var reconnect = injectStream(function () {
  var args = [].slice.call(arguments)
  return engine.apply(null, args)
})

initialized = false

reconnect(function(stream) {

  db.set(multilevel.client(window.__levelmanifest))  
  stream.pipe(db.get()).pipe(stream)

  db.get().auth({}, function (err, data) {
    if (err) {

      //
      // TODO: present a nice message for the user
      //
      return console.log(err)
    }

    if (!initialized) {
      initUserModules()
      initialized = true
    }

  })

}).connect('/wss')

function initUserModules() {

  $(function() {

    var markup = ''
    var css = ''
    var modules = []

    window.__usermodules.forEach(function(modulename) {

      var usermodule = require(modulename)

      markup += usermodule.html
      css += usermodule.css

      delete usermodule.html
      delete usermodule.css

      modules.push(usermodule)
    })

    insertcss(css)
    $('.main-container').html(markup)

    modules.forEach(function(usermodule) {
      addNav(usermodule)
    })
  })
}

function addNav(usermodule) {

  $nav = $('nav.secondary')
  var cleanup

  if (!usermodule.click || !usermodule.load) {
    throw new Error('module missing a click or load export')
  }

  var doc = document.createDocumentFragment()
  var input = document.createElement('input')
  doc.appendChild(input)

  input.id = Math.floor(Math.random()*9999) + '-nav'
  input.type = 'radio'
  input.name = 'radio-nav'
  input.setAttribute('class', 'radio-nav')

  var click = usermodule.click
  usermodule.click = function() {
    input.setAttribute('checked', true)
    click.apply(usermodule, arguments)
  }

  input.onclick = function() {
    $('.panel').hide()
    if (cleanup) {
      cleanup()
    }
    if (usermodule.leave) {
      cleanup = usermodule.leave
    }
    usermodule.click(db)
  }

  var label = document.createElement('label')
  doc.appendChild(label)

  label.setAttribute('for', input.id)

  var div = document.createElement('div')
  label.appendChild(div)

  div.setAttribute('class', 'ss-icon')
  div.innerText = usermodule.icon

  var labeltext = document.createTextNode(usermodule.label)
  label.appendChild(labeltext)

  $nav.append(doc)
  usermodule.load(db)
}
