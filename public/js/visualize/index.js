
//
// TODO: this file should get an API so that
// it's easy to add and invoke visualizations
//
var send = require('../socket').send
var cm = require('../widgets/cm')
var query = require('../widgets/query')

var visualize = exports

visualize.barchart = require('./charts/barchart')
visualize.stackedchart = require('./charts/stackedchart')
visualize.treemap = require('./charts/treemap')
visualize.timeseries = require('./charts/timeseries')

var $selectKeys = $('#selectKeys')
var $chooseVisualization = $('#chooseVisualization')
var $visualizations = $('#visualizations')

var queryTemplate = '<a class="secondary" data-key="{{key}}">{{name}}<div class="delete ss-icon">delete</div></a>'

var queries = {}
var poll

visualize.fetch = function(value) {

  var $group = $('[data-group="' + value.group + '"]');
  var query;

  queries[value.group] = value.queries;

  $group.empty();

  Object.keys(value.queries).forEach(function(key) {
    query = queryTemplate.replace(/{{key}}/g, value.queries[key].key);

    var queryName = value.queries[key].value.options.queryName

    query = query.replace(/{{name}}/g, queryName);
    $group.append(query);
  });
}

function serializeForm() {

  var $form = $('.visualization:visible form')
  var $inputs = $form.find('input:not([data-defualt])')

  var form = {}

  $inputs.each(function() {
    form[$(this).attr('data-id')] = $(this).val() || ''
  })

  return form
}

//
//  visualization sidebar navigation
//
var $visualizationLinks = $('#visualizations .left .links-container')

$visualizationLinks.on('click', function() {

  if ($(this).hasClass('selected')) {
    return
  }

  send({
    request: 'visualize/fetch',
    value: {
      group: $(this).find('.links').attr('data-group')
    }
  })

  $selectKeys.hide()

  $visualizationLinks.each(function(el) {
    $(this).removeClass('selected')
    $(this).find('.links').slideUp('fast')
  })

  $(this).addClass('selected')
  $(this).find('.links').slideDown('fast')
  location.hash = $(this).attr('data-target')
})

//
// configure query
//
var $addQueryLinks = $('#visualizations .configure')

$addQueryLinks.on('click', function(event) {

  $(this).closest('.links-container').trigger('click')

  $chooseVisualization.hide()
  $('.visualization .options').hide()
  $('.visualization:visible .options').show()

  event.preventDefault()
  return false
})

//
// restore a query that has been saved
//
var $savedQueries = $visualizationLinks.find('.links')

$savedQueries.on('click', 'a', function() {

  var $link = $(this)
  var $linkContainer = $link.closest('.links-container')

  var key = $link.attr('data-key')
  var group = $link.parent().attr('data-group')

  var options = queries[group][key].value.options
  var query = queries[group][key].value.query

  var $optionsForm = $('.visualization:visible form')
  var $queryForm = $('#query')

  $chooseVisualization.hide()
  $('.visualization .options').hide()

  $savedQueries.find('a').each(function(el) {
    $(this).removeClass('selected')
  })

  $link.addClass('selected')

  //
  // put all the saved values into the correct forms
  //
  Object.keys(options).forEach(function(key) {

    $optionsForm
      .find('[data-id="' + key + '"]')
      .val(options[key])
  })

  Object.keys(query).forEach(function(key) {

    if (key === 'reverse' && !!$('#reverse:checked').length === false) {
      $('#reverse').trigger('click')
    }
    else {

      if (key === 'end' && query[key].length > 0 && !!$('#range:checked').length === false) {
        $('#range').trigger('click')
      }

      $queryForm
        .find('[data-id="' + key + '"]')
        .val(query[key])
    }
  })

  //
  // polling function for sending the query at an interval
  //
  function submit() {

    if ($('.visualization:visible').length > 0 &&
      $linkContainer.hasClass('selected') &&
      cm.editing() === false) {

      send({
        request: 'visualize/' + group,
        value: {
          query: query.val(),
          options: serializeForm()
        }
      })
    }
  }

  submit()
  clearInterval(poll)
  poll = setInterval(submit, 6e2)

  $optionsForm.find('.submit .label').text('Pause')
  $optionsForm.find('.submit .ss-icon').text('pause')

})

$savedQueries.on('click', '.delete', function() {

  send({
    request: 'visualize/del',
    value: {
      key: $(this).parent().attr('data-key'),
      group: $(this).parent().parent().attr('data-group')
    }
  })
})

//
// close and submit buttons should close the options panel
//
$('.submit, .close').on('click', function() {
  $(".visualization:visible .options").hide()
})

//
// when a user starts to enter an object that they want to 
// plot, verify that it is actually in their data
//
var validateBounce
$('.validate-key').on('keyup', function() {

  if ($(this).val().length === 0) {

    $(this)
      .closest('.input')
      .removeClass('invalid')

    return
  }

  var that = this

  clearTimeout(validateBounce)
  validateBounce = setTimeout(function() {

    send({
      request: 'visualize/validatekey',
      value: {
        query: query.val(),
        options: { id: $(that).attr('data-id'), path: that.value }
      }
    })

    $(that)
      .closest('.input')
      .addClass('invalid')

  }, 32)
})

//
// date picker widget
//
$('.datepicker').each(function(i, el) {
  new Pikaday({
    field: el,
    format: 'D MMM YYYY'
  })
})

//
// add plot-table objects to the stacked area chart
//
$('[data-id="pathsToValues"]').tagsInput({
  width: '',
  height: '60px',
  defaultText: 'Add an object path',
  onAddTag: function(path) {
    
    var id = 'tag_' + Math.floor(Math.random()*100)
    $('#stackedchart .tag:last-of-type')
      .attr('data-id', id)
      .addClass('invalid')

    send({
      request: 'visualize/validatekey',
      value: {
        query: query.val(),
        options: { id: id, path: path }
      }
    })

  }
})

//
// save a visualization as an image
//
$('.snapshot').on('click', function() {

  var canvas = document.createElement('canvas')
  canvg(canvas, $(".visualization:visible .container").html().trim())

  var theImage = canvas.toDataURL('image/pngbase64')
  window.open(theImage)
})

//
// submit a visualization form
//
$('.submit').on('click', function() {

  var that = this

  function submit() {

    if (cm.editing() === false) {

      send({
        request: $(that).attr('data-id'),
        value: {
          query: query.val(),
          options: serializeForm()
        }
      })
    }
  }

  if (poll) {
    clearInterval(poll)
    $(this).find('.label').text('Run')
    $(this).find('.ss-icon').text('sync')
    poll = null
  }
  else {
    submit()
    $(this).find('.label').text('Pause')
    $(this).find('.ss-icon').text('pause')
    poll = setInterval(submit, 5e3)
  }

})

//
// save a visualization
//
$('.save').on('click', function() {

  var value = {
    query: query.val(),
    options: serializeForm()
  }

  send({
    request: 'visualize/save',
    value: value
  })
})
