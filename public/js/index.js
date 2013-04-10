$(function() {

  var $startKey = $('#startKey');
  var $endKey = $('#endKey');
  var $limit = $('#limit');
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

  var currentSelection = '';
  var currentDatasource = 'usrdb';

  function send(message) {
    message.dbname = currentDatasource;
    message = JSON.stringify(message);
    socket.send(message);
  }

  function getOpts() {

    var opts = {
      limit: parseInt($limit.val()) || 1000,
      reverse: !!$('#reverse:checked').length
    };

    if ($startKey.val().length > 0) {
      opts.start = $startKey.val();
    }

    if ($endKey.val().length > 0 && $('#range:checked').length) {
      opts.end = $endKey.val();
    }

    return opts;
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
        value: getOpts()
      });

    }, 16);
  }

  //
  // visualization stuff
  //
  var cache = {};
  var metrics = [];

  function addVisualizationMetric(name) {

    cache[name] = [];

    var last;

    var m = context.metric(function(start, stop, step, callback) {

      start = +start, stop = +stop;
      if (isNaN(last)) last = start;

      socket.send(JSON.stringify({ key: name }));
      
      cache[name] = cache[name].slice((start - stop) / step);
      callback(null, cache[name]);
    }, name);

    m.name = name;
    return m;
  }

  function renderVisualization() {
    d3.select("#main").call(function(div) {

      div
        .append("div")
        .attr("class", "axis")
        .call(context.axis().orient("top"));

      div
        .selectAll(".horizon")
          .data(metrics)
        .enter().append("div")
          .attr("class", "horizon")
          .call(context.horizon().extent([-20, 20]).height(125));

      div.append("div")
        .attr("class", "rule")
         .call(context.rule());

    });

    // On mousemove, reposition the chart values to match the rule.
    context.on("focus", function(i) {
      var px = i == null ? null : context.size() - i + "px";
      d3.selectAll(".value").style("right", px);
    });
  }

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

      $keyList.empty();
      $selectedKeyCount.text('');

      if (message.value.length > 0) {
        $noKeys.hide();
      }
      else {
        $noKeys.show();
      }

      message.value.forEach(function(key) {
        $keyList.append(keyTemplate.replace(/{{key}}/g, key));
      });
    }

    //
    // count the tagged keys
    // TODO: 
    //
    else if (response === 'allTaggedKeys') {
      if (message.value.length > 0) {
        $selectKeys.hide();
      }
      else {
        $selectKeys.show();
      }
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
    // when an input value needs to be validated
    //
    else if (response === 'validateKey') {

      if (value.valid) {
        $('#' + value.id)
          .removeClass('invalid')
          .closest('.input')
          .removeClass('invalid');
      }
    }

    //
    // build a tree map
    //
    else if (response === 'buildTreeMap') {

      VIS.buildTreeMap(value);
    }

    //
    // build a stacked area chart
    //
    else if (response === 'buildStackedAreaChart') {

      VIS.buildStackedAreaChart(value);
    }

    //
    // build a bar chart
    //
    else if (response === 'buildBarChart') {

      VIS.buildBarChart(value);
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
      currentDatasource = 'tagdb';
      $visualizations.show();

      send({
        request: 'allTaggedKeys',
        value: getOpts()
      });      
    }
    else if (this.id === 'nav-tags') {
      currentDatasource = 'tagdb';
      $visualizations.hide();
      keyListUpdate();
    }
    else if (this.id == 'nav-fav') {
      currentDatasource = 'sysdb';
      $visualizations.hide();
      keyListUpdate();
    }

    $selectOne.show();

  });

  //
  // when a user selects a single item from the key list
  //
  $keyList.on('change', function() {

    var count = 0;;

    $keyList.find('option:selected').each(function(key){
      count ++;
    });

    if (count > 1) {

      $selectedKeyCount.text(count);
      $selectOne.show();
    }
    else {

      $selectedKeyCount.text('');

      $selectOne.hide();
      currentSelection = this.value;

      send({
        request: 'editorUpdate', 
        value: this.value 
      });
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

    var value = { operations: operations, opts: getOpts() };

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
  // when the user wants to favorite the currently selected keys
  //
  $('#addto-favs').click(function() {

    send({
      request: 'favKeys',
      value: getSelectedKeys()
    });
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
  var $visualizationLinks = $('#visualizations .left a.primary');

  $visualizationLinks.on('click', function() {
    $visualizationLinks.each(function() {
      $(this).removeClass('selected');
      $(this).next('.links').slideUp('fast');
    });
    $(this).addClass('selected');
    $(this).next('.links').slideDown('fast');
  });

  var $configurationLinks = $('#visualizations .left a.secondary');

  $configurationLinks.on('click', function(event) {
    $chooseVisualization.hide();
    $(".visualization:visible .options").toggle();

    event.preventDefault();
    return false;
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

      var value = { id: that.id, key: that.value };

      send({
        request: 'validateKey',
        value: value
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
  $('#vis-stacked-area .pathsToValues').tagsInput({
    width: '',
    height: '60px',
    defaultText: 'Add an object path',
    onAddTag: function(key) {
      
      var id = 'tag_' + Math.floor(Math.random()*100);
      $('#vis-stacked-area .tag:last-of-type')
        .attr('id', id)
        .addClass('invalid');

      var value = { id: id, key: key };

      send({
        request: 'validateKey',
        value: value
      });

    }
  });

  //
  // build a stacked area chart
  //
  $('#buildStackedAreaChart').on('click', function() {

    var $visibleVisualization = $('.visualization:visible');

    var value = {
      pathToX: $visibleVisualization.find('.pathToX').val(),
      pathsToValues: $visibleVisualization.find('.pathsToValues').val(),
      dateTimeFormat: $visibleVisualization.find('.dateTimeFormat').val()
    };

    var dateStart = $visibleVisualization.find('.dateStart').val();
    var dateEnd = $visibleVisualization.find('.dateEnd').val();

    if (dateStart.length > 0) {
      value.dateStart = dateStart;
    }

    if (dateEnd.length > 0) {
      value.dateEnd = dateEnd;
    }

    send({
      request: 'buildStackedAreaChart',
      value: value
    });
  });
  
  //
  // save a visualization as an image
  //
  $('.save-visualization').on('click', function() {

    var canvas = document.createElement('canvas');
    canvg(canvas, $(".visualization:visible .container").html().trim());

    var theImage = canvas.toDataURL('image/png;base64');
    window.open(theImage);
  });

  //
  // build a tree-map
  //
  $('#buildTreeMap').on('click', function() {

    send({
      request: 'buildTreeMap',
      value: $('#treeMapToken').val()
    });
  });

  //
  // build a bar chart
  //
  $('#buildBarChart').on('click', function() {

    var $visibleVisualization = $('.visualization:visible');

    var value = {
      pathToX: $visibleVisualization.find('.pathToX').val(),
      pathToY: $visibleVisualization.find('.pathToY').val(),
      pathToXMask: $visibleVisualization.find('.pathToXMask').val(),
      dateTimeFormat: $visibleVisualization.find('.dateTimeFormat').val()
    };

    var dateStart = $visibleVisualization.find('.dateStart').val();
    var dateEnd = $visibleVisualization.find('.dateEnd').val();

    if (dateStart.length > 0) {
      value.dateStart = dateStart;
    }

    if (dateEnd.length > 0) {
      value.dateEnd = dateEnd;
    }

    send({
      request: 'buildBarChart',
      value: value
    });
  });

});

