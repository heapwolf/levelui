
require('./lib/codemirror-3.1/lib/codemirror')
require('./lib/codemirror-3.1/mode/javascript/javascript')
require('./lib/jsonlint')
require('./lib/codemirror-3.1/addon/lint/lint')
require('./lib/codemirror-3.1/addon/lint/json-lint')

require('./lib/d3/d3.v3.min')
require('./lib/d3/cubism.v1')

require('./lib/canvg.min')
require('./lib/moment')
require('./lib/jquery/jquery')
require('./lib/jquery/jquery.tagsinput.min')
require('./lib/jquery/jquery.datepicker')

$(function() {

  var addons = require('./addons')
  var messages = require('./messages')

  messages.on('metaUpdate', function(json) {
    if (json.value.path) {
      $('#pathtodb').text(json.value.path)
    }
  })

  addons.create({
    id: 'allkeys',
    label: 'All Keys',
    checked: true,
    icon: 'search',
    dbname: 'usrdb',
    module: require('../addons/allkeys')
  })

  addons.create({
    id: 'taggedkeys',
    label: 'Tagged Keys',
    dbname: 'sysdb',
    icon: 'tag',
    module: require('../addons/taggedkeys')
  })

  addons.create({
    id: 'visualize',
    label: 'Visualize',
    icon: 'piechart',
    module: require('../addons/visualize')
  })

  addons.create({
    id: 'settings',
    label: 'Settings',
    icon: 'cog',
    module: require('../addons/settings')
  })
})
