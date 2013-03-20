websocket(function(socket) {

  //
  // cache some of the frequently referred to DOM elements.
  //
  var $startKey = $('#startKey');
  var $endKey = $('#endKey');
  var $limit = $('#limit');
  var $controls = $('.control');
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

  function request(message) {
    message.dbname = currentDatasource;
    message = JSON.stringify(message);
    socket.write(message);
  }

  function getOpts() {

    var opts = {
      limit: parseInt($limit.val()) || 100,
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

      request({ 
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

  // var context = cubism.context()
  //   .serverDelay(0)
  //   .clientDelay(0)
  //   .step(1e3)
  //   .size(960);

  function visualizationUpdate() {

  }

  function addVisualizationMetric(name) {

    cache[name] = [];

    var last;

    var m = context.metric(function(start, stop, step, callback) {

      start = +start, stop = +stop;
      if (isNaN(last)) last = start;

      socket.write(JSON.stringify({ key: name }));
      
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
  socket.on('data', function(message) {

    try { message = JSON.parse(message); } catch(ex) {}

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
    // tagged keys
    //
    else if (response === 'buildTreeMap') {
      buildTreeMap(value);
    }

    else if (response === 'buildStackedAreaChart') {
      buildStackedAreaChart(value);
    }

  });

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

      request({
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
      currentDatasource = 'favdb';
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

      request({
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

    request({
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

    request({
      request: 'favKeys',
      value: getSelectedKeys()
    });
  });

  //
  // when the user wants to tag the currently selected keys
  //
  $('#addto-tags').click(function() {
    
    request({
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
  // if the data changes, save it when its valid
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

        request({
          request: 'updateValue',
          value: value
        });
      }

    }, 800);

  });


  //
  // visualizations stuff
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

  $('.submit, .close').on('click', function() {
    $(".visualization:visible .options").hide();
  });

  var pickerRangeStart = new Pikaday({
    field: document.querySelectorAll('#vis-stacked-area .dateStart')[0],
    format: 'D MMM YYYY'
  });

  var pickerRangeEnd = new Pikaday({
    field: document.querySelectorAll('#vis-stacked-area .dateEnd')[0],
    format: 'D MMM YYYY'
  });

  //
  // stacked area chart stuff
  //
  $('#pathsToValues').tagsInput({
    width: '',
    height: '60px',
    defaultText: 'Add an object path'
  });

  $('#buildStackedAreaChart').on('click', function() {

    var value = {
      pathToDate: $('#pathToDate').val(),
      pathsToValues: $('#pathsToValues').val(),
      granularity: $("#stackedAreaGranularity").val(),
    };

    var dateStart = $("#vis-stacked-area .dateStart").val();
    var dateEnd = $("#vis-stacked-area .dateEnd").val();

    if (dateStart.length > 0) {
      value.dateStart = dateStart;
    }

    if (dateEnd.length > 0) {
      value.dateEnd = dateEnd;
    }

    request({
      request: 'buildStackedAreaChart',
      value: value
    });
  });

  function buildStackedAreaChart(data) {

    var $container = $("#vis-stacked-area .container");

    $container.empty();

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = $container.width() - margin.left - margin.right,
        height = $container.height() - margin.top - margin.bottom;

    var parseDate;

    if ($("#stackedAreaGranularity").val() === 'date') {
      parseDate = d3.time.format("%y-%b-%d").parse;
    } 
    else {
      parseDate = d3.time.format("%y-%b-%d-%H-%M").parse;
    }

    //
    // TODO: Catch unparsable dates
    //

    var formatPercent = d3.format(".0%");

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category20();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(formatPercent);

    var area = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });

    var stack = d3.layout.stack()
        .values(function(d) { return d.values; });

    var svg = d3.select("#vis-stacked-area .container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

      data.forEach(function(d) {
        d.date = parseDate(d.date);
      });

      var browsers = stack(color.domain().map(function(name) {
        return {
          name: name,
          values: data.map(function(d) {
            return {date: d.date, y: d[name] / 100};
          })
        };
      }));

      x.domain(d3.extent(data, function(d) { return d.date; }));

      var browser = svg.selectAll(".browser")
          .data(browsers)
        .enter().append("g")
          .attr("class", "areachart");

      browser.append("path")
          .attr("class", "area")
          .attr("d", function(d) { return area(d.values); })
          .style("fill", function(d) { return color(d.name); });

      browser.append("text")
          .datum(function(d) { return { name: d.name, value: d.values[d.values.length - 1] }; })
          .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.y0 + d.value.y / 2) + ")"; })
          .attr("x", -6)
          .attr("dy", ".35em")
          .text(function(d) { return d.name; });

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis);
  }
  
  //
  // tree-map stuff
  //
  $('#buildTreeMap').on('click', function() {

    request({
      request: 'buildTreeMap',
      value: $('#treeMapToken').val()
    });
  });

  function buildTreeMap(data) {

    $("#vis-tree-map .container").empty();

    var w = $("#vis-tree-map .container").width(),
        h = $("#vis-tree-map .container").height(),
        x = d3.scale.linear().range([0, w]),
        y = d3.scale.linear().range([0, h]),
        color = d3.scale.category20c(),
        root,
        node;

    var treemap = d3.layout.treemap()
        .round(false)
        .size([w, h])
        .sticky(true)
        .value(function(d) { return d.size; });

    var svg = d3.select("#vis-tree-map .container").append('div')
        .attr("class", "chart")
      .append("svg:svg")
        .attr("width", w)
        .attr("height", h)
      .append("svg:g")
        .attr("transform", "translate(.5,.5)");
    
      node = root = data;

      var nodes = treemap.nodes(root)
          .filter(function(d) { return !d.children; });

      var cell = svg.selectAll("g")
          .data(nodes)
        .enter().append("svg:g")
          .attr("class", "cell")
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .on("click", function(d) { return zoom(node == d.parent ? root : d.parent); });

      cell.append("svg:title")
         .text(function(d, i) { return d.name; });

      cell.append("svg:rect")
          .attr("width", function(d) { return d.dx - 1; })
          .attr("height", function(d) { return d.dy - 1; })
          .style("fill", function(d) { return color(d.parent.name); });

      cell.append("svg:text")
          .attr("x", function(d) { return d.dx / 2; })
          .attr("y", function(d) { return d.dy / 2; })
          .attr("dy", ".20em")
          .attr("text-anchor", "middle")
          .text(function(d) { return d.size })
          .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; });

      d3.select(window).on("click", function() { zoom(root); });

      d3.select("#vis-tree-map select").on("change", function() {
        treemap.value(this.value == "size" ? size : count).nodes(root);
        zoom(node);
      });

    function size(d) {
      return d.size;
    }

    function count(d) {
      return 1;
    }

    function zoom(d) {
      var kx = w / d.dx, ky = h / d.dy;
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      var t = svg.selectAll("g.cell").transition()
          .duration(d3.event.altKey ? 7500 : 750)
          .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

      t.select("rect")
          .attr("width", function(d) { return kx * d.dx - 1; })
          .attr("height", function(d) { return ky * d.dy - 1; })

      t.select("text")
          .attr("x", function(d) { return kx * d.dx / 2; })
          .attr("y", function(d) { return ky * d.dy / 2; })
          .style("opacity", function(d) { return kx * d.dx > d.w ? 1 : 0; });

      node = d;
      d3.event.stopPropagation();
    }
  }

  $('#buildBarChart').on('click', function() {

    request({
      request: 'buildBarChart',
      value: $('#treeMapToken').val()
    });
  });

  function buildBarChart(data) {

    var $visbar = $("#vis-bar .container");

    var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = $visbar.width() - margin.left - margin.right,
        height = $visbar.height() - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .rangeRound([height, 0]);

    var color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      color.domain(d3.keys(data[0]).filter(function(key) { return key !== "State"; }));

      data.forEach(function(d) {
        var y0 = 0;
        d.ages = color.domain().map(function(name) { return {name: name, y0: y0, y1: y0 += +d[name]}; });
        d.total = d.ages[d.ages.length - 1].y1;
      });

      data.sort(function(a, b) { return b.total - a.total; });

      x.domain(data.map(function(d) { return d.State; }));
      y.domain([0, d3.max(data, function(d) { return d.total; })]);

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Population");

      var state = svg.selectAll(".state")
          .data(data)
        .enter().append("g")
          .attr("class", "g")
          .attr("transform", function(d) { return "translate(" + x(d.State) + ",0)"; });

      state.selectAll("rect")
          .data(function(d) { return d.ages; })
        .enter().append("rect")
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.y1); })
          .attr("height", function(d) { return y(d.y0) - y(d.y1); })
          .style("fill", function(d) { return color(d.name); });

      var legend = svg.selectAll(".legend")
          .data(color.domain().slice().reverse())
        .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

      legend.append("rect")
          .attr("x", width - 18)
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", color);

      legend.append("text")
          .attr("x", width - 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "end")
          .text(function(d) { return d; });

    }


    function buildHeatMap(data) {

      data = [
          {score: 0.1, row: 0, col: 0},
          {score: 0.2, row: 0, col: 1},
          {score: 0.4, row: 1, col: 0},
          {score: 0.5, row: 1, col: 1},
          {score: 0.6, row: 2, col: 0},
          {score: 0.7, row: 2, col: 1},
          {score: 0.8, row: 3, col: 0},
          {score: 0.9, row: 3, col: 1}
      ];

      //height of each row in the heatmap
      //width of each column in the heatmap
      var gridSize = 100,
          h = gridSize,
          w = gridSize,
          rectPadding = 30;

      var colorLow = 'white', colorMed = 'steelblue', colorHigh = 'blue';

      var margin = {top: 20, right: 80, bottom: 30, left: 50},
          width = 640 - margin.left - margin.right,
          height = 380 - margin.top - margin.bottom;

      var colorScale = d3.scale.linear()
           .domain([-1, 0, 1])
           .range([colorLow, colorMed, colorHigh]);

      var svg = d3.select("#vis-heatmap").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var heatMap = svg.selectAll(".heatmap")
          .data(data, function(d) { return d.col + ':' + d.row; })
        .enter().append("svg:rect")
          .attr("x", function(d) { return d.row * w; })
          .attr("y", function(d) { return d.col * h; })
          .attr("width", function(d) { return w; })
          .attr("height", function(d) { return h; })
          .style("fill", function(d) { return colorScale(d.score); });

    }

});

