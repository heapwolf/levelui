var $start = $('[data-id="start"]')
var $end = $('[data-id="end"]')
var $limit = $('[data-id="limit"]')

var query = exports

query.val = function() {

  var reverse = !!$('#reverse:checked').length

  var opts = {
    limit: parseInt($limit.val()) || 1000,
    reverse: reverse
  }

  if ($start.val().length > 0) {
    opts.start = $start.val()
  }

  if ($end.val().length > 0 && $('#range:checked').length) {
    opts.end = $end.val()
  }

  return opts
}

//
// when the user wants to do more than just find a key.
//
$('#range').on('click', function() {

  if ($('#range:checked').length === 0) {
    $('#endKeyContainer').hide()
    $('#startKeyContainer .add-on').text('Search')
    $('#keyListContainer').removeClass('extended-options')
  }
  else {
    $('#endKeyContainer').show()
    $('#startKeyContainer .add-on').text('Start')
    $('#keyListContainer').addClass('extended-options')
  }
})
