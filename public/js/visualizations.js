VIS = {};

VIS.buildBarChart = function(data) {

  var $visbar = $("#vis-bar .container");
  $visbar.empty();

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = $visbar.width() - margin.left - margin.right,
      height = $visbar.height() - margin.top - margin.bottom;

  var formatPercent = d3.format(".0%");

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var svg = d3.select("#vis-bar .container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    data.forEach(function(d) {
      d.Y = +d.Y;
    });

    x.domain(data.map(function(d) { return moment(d.X).format($("#vis-bar-format").val()).toString(); }));
    y.domain([0, d3.max(data, function(d) { return d.Y; })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)

    var bar = svg.selectAll(".bar")
        .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.X); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.Y); })
        .attr("height", function(d) { return height - y(d.Y); })

    bar.append("svg:title")
      .text(function(d, i) { return d.key; });

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

};

VIS.buildStackedAreaChart = function(data) {

  var $container = $("#vis-stacked-area .container");

  $container.empty();

  var margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = $container.width() - margin.left - margin.right,
      height = $container.height() - margin.top - margin.bottom;

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
      .x(function(d) { return x(d.X); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });

  var stack = d3.layout.stack()
      .values(function(d) { return d.values; });

  var svg = d3.select("#vis-stacked-area .container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    color.domain(d3.keys(data[0]).filter(function(key) { return key !== "X"; }));

    data.forEach(function(d) {
      if ($('#vis-stacked-area-format').val().length > 0) {
        d.X = moment(d.X).toDate();
      }
      else {
        d.X = +d.X;
      }
    });

    var browsers = stack(color.domain().map(function(name) {
      return {
        name: name,
        values: data.map(function(d) {
          return { X: d.X, y: d[name] / 100 };
        })
      };
    }));

    x.domain(d3.extent(data, function(d) { return d.X; }));

    var browser = svg.selectAll(".browser")
        .data(browsers)
      .enter().append("g")
        .attr("class", "areachart");

    browser.append("path")
        .attr("class", "area")
        .attr("d", function(d) { return area(d.values);  })
        .style("fill", function(d) { return color(d.name); });

    browser.append("text")
        .datum(function(d) { return { name: d.name, value: d.values[d.values.length - 1] }; })
        .attr("transform", function(d) { return "translate(" + x(d.value.X) + "," + y(d.value.y0 + d.value.y / 2) + ")"; })
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
};

VIS.buildTreeMap = function(data) {

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
};
