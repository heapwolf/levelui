$(function() {

  var $start = $('[data-id="start"]');
  var $end = $('[data-id="end"]');
  var $limit = $('[data-id="limit"]');
  var $controls = $('.control, #refresh');
  var $keyList = $('#keyList');
  var $selectedKeyCount = $('.selected-key-count');
  var $veryLarge = $('#veryLarge');
  var $selectOne = $('#selectOne');

  var $selectKeys = $('#selectKeys');
  var $chooseVisualization = $('#chooseVisualization');
  var $noKeys = $('#noKeys');

  var $visualizations = $('#visualizations');

  var keyTemplate = '<option value="{{key}}" title="{{key}}">{{key}}</option>';
  var queryTemplate = '<a class="secondary" data-key="{{key}}">{{name}}<div class="delete ss-icon">delete</div></a>';

  var currentSelection = '';
  var currentDatasource = 'usrdb';
  var editing = false;

  function send(message) {
    message.dbname = currentDatasource;
    message = JSON.stringify(message);
    socket.send(message);
  }

  function getQuery() {

    var reverse = !!$('#reverse:checked').length;

    var opts = {
      limit: parseInt($limit.val()) || 1000,
      reverse: reverse
    };

    if ($start.val().length > 0) {
      opts.start = $start.val();
    }

    if ($end.val().length > 0 && $('#range:checked').length) {
      opts.end = $end.val();
    }

    //
    // TODO: this will probably change in levelup > 0.7.0
    //
    if (reverse) {
      var end = opts.end;
      opts.end = opts.start;
      opts.start = end;
      opts.limit = opts.limit;
    }

    return opts;
  }

  function serializeForm() {

    var $form = $('.visualization:visible form');
    var $inputs = $form.find('input:not([data-defualt])');

    var form = {};

    $inputs.each(function() {
      form[$(this).attr('data-id')] = $(this).val() || '';
    });

    return form;
  }

  function getSelectedKeys() {
    var keys = [];

    $keyList.find('option:selected').each(function(key){
      keys.push(this.value);
    });

    return keys;
  }

  var inputBounce;

  function keyListUpdate() {

    clearTimeout(inputBounce);
    inputBounce = setTimeout(function() {

      send({
        request: 'keyListUpdate', 
        value: getQuery()
      });

    }, 16);
  }

  //
  // visualization stuff
  //
  var cache = {};
  var queries = {};
  var poll;

  //
  // socket stuff
  //
  socket.onmessage = function(message) {

    try { message = JSON.parse(message.data); } catch(ex) {}

    var response = message.response;
    var value = message.value;

    //
    // when a value gets an update
    //
    if (response === 'editorUpdate') {
      if (JSON.stringify(value.value).length < 1e4) {

        $veryLarge.hide();
        editor_json.doc.setValue(JSON.stringify(value.value, 2, 2));
      }
      else {

        $veryLarge.show();
        $veryLarge.unbind('click');
        $veryLarge.on('click', function() {
          editor_json.doc.setValue(JSON.stringify(value.value, 2, 2));
          $veryLarge.hide();
        });
      }
    }

    //
    // when there is an update for the list of keys
    //
    else if (response === 'keyListUpdate') {

      var currentSelections = $keyList.val();

      $keyList.empty();
      $selectedKeyCount.text('');

      if (value.length > 0) {
        $noKeys.hide();
      }
      else {
        $noKeys.show();
      }

      value.forEach(function(key) {
        if (key)
        $keyList.append(keyTemplate.replace(/{{key}}/g, key));
      });

      $keyList.val(currentSelections);
      $keyList.trigger('change');

    }

    //
    // general information about the page
    //
    else if (response === 'metaUpdate') {

      if (value.path) {
        $('#pathtodb').text(value.path);
      }
    }

    //
    // visualization events
    //
    else if (response === 'vis-validatekey') {

      if (value.valid) {
        $('.visualization:visible form [data-id="' + value.id + '"]')
          .removeClass('invalid')
          .closest('.input')
          .removeClass('invalid');
      }
    }
    else if (response === 'vis-treemap') {
      VIS.treemap(value);
    }
    else if (response === 'vis-stackedchart') {
      VIS.stackedchart(value);
    }
    else if (response === 'vis-barchart') {
      VIS.barchart(value);
    }
    else if (response === 'vis-fetch') {

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
  };

  $('nav.secondary input').on('click', function() {

    //
    // TODO: clean this up
    //
    if(this.id === 'nav-all') {
      currentDatasource = 'usrdb';
      $visualizations.hide();
      keyListUpdate();
    }
    else if (this.id == 'nav-vis') {
      currentDatasource = 'usrdb';
      $visualizations.show();
    }
    else if (this.id == 'nav-tag') {
      currentDatasource = 'sysdb';
      $visualizations.hide();
      keyListUpdate();
    }

    $selectOne.show();

  });


  setInterval(function () {

    if ($keyList.scrollTop() === 0 && editing === false) {
      keyListUpdate();
    }

  }, 6e2);

  //
  // when a user selects a single item from the key list
  //
  $keyList.on('change', function() {

    var count = 0;

    $keyList.find('option:selected').each(function(key) {
      count ++;
    });

    if (count > 1) {

      $selectedKeyCount.text(count);
      $selectOne.show();
    }
    else if (count === 1) {

      $selectedKeyCount.text('');

      $selectOne.hide();
      currentSelection = this.value;

      send({
        request: 'editorUpdate', 
        value: this.value 
      });
    }
    else {
      $selectedKeyCount.text('');
      $selectOne.show();
    }
  });

  //
  // when a user wants to delete one or more keys from the key list
  //
  $('#delete-keys').on('click', function() {

    var operations = [];

    $keyList.find('option:selected').each(function(key){
      operations.push({ type: 'del', key: this.value });
    });

    var value = { operations: operations, opts: getQuery() };

    send({
      request: 'deleteValues',
      value: value
    });

    $selectOne.show();
  });

  //
  // when the user wants to do more than just find a key.
  //
  $('#range').on('click', function() {

    if ($('#range:checked').length === 0) {
      $('#endKeyContainer').hide();
      $('#startKeyContainer .add-on').text('Search');
      $('#keyListContainer').removeClass('extended-options');
    }
    else {
      $('#endKeyContainer').show();
      $('#startKeyContainer .add-on').text('Start');
      $('#keyListContainer').addClass('extended-options');
    }
  });

  //
  // when the user wants to tag the currently selected keys
  //
  $('#addto-tags').click(function() {

    send({
      request: 'tagKeys',
      value: getSelectedKeys()
    });
  });

  //
  // when a user is trying to enter query criteria
  //
  $controls.on('keyup mouseup click', keyListUpdate);

  //
  // build the editor
  //
  var editor_json = CodeMirror.fromTextArea(document.getElementById("code-json"), {
    lineNumbers: true,
    mode: "application/json",
    gutters: ["CodeMirror-lint-markers"],
    lintWith: CodeMirror.jsonValidator,
    viewportMargin: Infinity
  });

  //
  // if the data in the editor changes and it's valid, save it
  //

  editor_json.on('blur', function() {
    editing = false;
  });

  editor_json.on('focus', function() {
    editing = true;
  });

  var saveBounce;
  editor_json.on('change', function(cm, change) {

    clearTimeout(saveBounce);
    saveBounce = setTimeout(function() {

      if(cm._lintState.marked.length === 0 && cm.doc.isClean() === false) {

        var value = { 
          key: currentSelection,
          value: JSON.parse(editor_json.doc.getValue())
        };

        send({
          request: 'updateValue',
          value: value
        });
      }

    }, 800);
  });

  //
  //  visualization sidebar navigation
  //
  var $visualizationLinks = $('#visualizations .left .links-container');

  $visualizationLinks.on('click', function() {

    if ($(this).hasClass('selected')) {
      return;
    }

    send({
      request: 'vis-fetch',
      value: {
        group: $(this).find('.links').attr('data-group')
      }
    });

    $selectKeys.hide();

    $visualizationLinks.each(function(el) {
      $(this).removeClass('selected');
      $(this).find('.links').slideUp('fast');
    });

    $(this).addClass('selected');
    $(this).find('.links').slideDown('fast');
    location.hash = $(this).attr('data-target');
  });

  //
  // configure query
  //
  var $addQueryLinks = $('#visualizations .configure');

  $addQueryLinks.on('click', function(event) {

    $(this).closest('.links-container').trigger('click');

    $chooseVisualization.hide();
    $('.visualization .options').hide();
    $('.visualization:visible .options').show();

    event.preventDefault();
    return false;
  });

  //
  // restore a query that has been saved
  //
  var $savedQueries = $visualizationLinks.find('.links');

  $savedQueries.on('click', 'a', function() {

    var key = $(this).attr('data-key');
    var group = $(this).parent().attr('data-group');

    var options = queries[group][key].value.options;
    var query = queries[group][key].value.query;

    var $optionsForm = $('.visualization:visible form');
    var $queryForm = $('#query');

    $chooseVisualization.hide();
    $('.visualization .options').hide();

    $savedQueries.find('a').each(function(el) {
      $(this).removeClass('selected');
    });

    $(this).addClass('selected');

    //
    // put all the saved values into the correct forms
    //
    Object.keys(options).forEach(function(key) {

      $optionsForm
        .find('[data-id="' + key + '"]')
        .val(options[key]);
    });

    Object.keys(query).forEach(function(key) {

      if (key === 'reverse' && !!$('#reverse:checked').length === false) {
        $('#reverse').trigger('click');
      }
      else {

        if (key === 'end' && query[key].length > 0 && !!$('#range:checked').length === false) {
          $('#range').trigger('click');
        }

        $queryForm
          .find('[data-id="' + key + '"]')
          .val(query[key]);
      }
    });

    //
    // polling function for sending the query at an interval
    //
    function submit() {

      if ($('.visualization:visible').length > 0 && editing === false) {
        send({
          request: 'vis-' + group,
          value: {
            query: getQuery(),
            options: serializeForm()
          }
        });
      }
    }

    submit();
    clearInterval(poll);
    poll = setInterval(submit, 6e2);

    $optionsForm.find('.submit .label').text('Pause');
    $optionsForm.find('.submit .ss-icon').text('pause');

  });

  $savedQueries.on('click', '.delete', function() {

    send({
      request: 'vis-delete',
      value: {
        key: $(this).parent().attr('data-key'),
        group: $(this).parent().parent().attr('data-group')
      }
    });
  });

  //
  // close and submit buttons should close the options panel
  //
  $('.submit, .close').on('click', function() {
    $(".visualization:visible .options").hide();
  });

  //
  // when a user starts to enter an object that they want to 
  // plot, verify that it is actually in their data
  //
  var validateBounce;
  $('.validate-key').on('keyup', function() {

    if ($(this).val().length === 0) {

      $(this)
        .closest('.input')
        .removeClass('invalid');

      return;
    }

    var that = this;

    clearTimeout(validateBounce);
    validateBounce = setTimeout(function() {

      send({
        request: 'vis-validatekey',
        value: {
          query: getQuery(),
          options: { id: $(that).attr('data-id'), path: that.value }
        }
      });

      $(that)
        .closest('.input')
        .addClass('invalid');

    }, 32);
  });

  //
  // date picker widget
  //
  $('.datepicker').each(function(i, el) {
    new Pikaday({
      field: el,
      format: 'D MMM YYYY'
    });
  });

  //
  // add plot-table objects to the stacked area chart
  //
  $('[data-id="pathsToValues"]').tagsInput({
    width: '',
    height: '60px',
    defaultText: 'Add an object path',
    onAddTag: function(path) {
      
      var id = 'tag_' + Math.floor(Math.random()*100);
      $('#stackedchart .tag:last-of-type')
        .attr('data-id', id)
        .addClass('invalid');

      send({
        request: 'vis-validatekey',
        value: {
          query: getQuery(),
          options: { id: id, path: path }
        }
      });

    }
  });
  
  //
  // save a visualization as an image
  //
  $('.snapshot').on('click', function() {

    var canvas = document.createElement('canvas');
    canvg(canvas, $(".visualization:visible .container").html().trim());

    var theImage = canvas.toDataURL('image/png;base64');
    window.open(theImage);
  });

  //
  // submit a visualization form
  //
  $('.submit').on('click', function() {

    var that = this;

    function submit() {

      if (editing === false) {

        send({
          request: $(that).attr('data-id'),
          value: {
            query: getQuery(),
            options: serializeForm()
          }
        });
      }
    }

    if (poll) {
      clearInterval(poll);
      $(this).find('.label').text('Run');
      $(this).find('.ss-icon').text('sync');
      poll = null;
    }
    else {
      submit();
      $(this).find('.label').text('Pause');
      $(this).find('.ss-icon').text('pause');
      poll = setInterval(submit, 5e3);
    }

  });

  //
  // save a visualization
  //
  $('.save').on('click', function() {

    var value = {
      query: getQuery(),
      options: serializeForm()
    };

    send({
      request: 'vis-save',
      value: value
    });
  });

});
