var messages = require('./messages')
var $nav = $('nav.secondary')
var $panels = $('.panel')

exports.create = function(opts) {

  if (!opts.module.click || !opts.module.load) {
    throw new Error('requires a click and a load function')
  }

  var doc = document.createDocumentFragment()

  var input = document.createElement('input')
  doc.appendChild(input)

  input.id = opts.id + '-nav'
  input.type = 'radio'
  input.name = 'radio-nav'
  input.setAttribute('class', 'radio-nav')

  input.onclick = function() {
    $panels.hide()
    opts.module.click(opts)
  }

  if (opts.checked) {
    input.setAttribute('checked', opts.checked)
    $('#' + opts.id).show()
  }

  var label = document.createElement('label')
  doc.appendChild(label)

  label.setAttribute('for', input.id)

  var div = document.createElement('div')
  label.appendChild(div)

  div.setAttribute('class', 'ss-icon')
  div.innerText = opts.icon

  var labeltext = document.createTextNode(opts.label)
  label.appendChild(labeltext)

  $nav.append(doc)
  opts.module.load()
}
