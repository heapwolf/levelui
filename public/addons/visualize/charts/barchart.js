
var moment = require('../../../js/lib/moment')

module.exports = function(data) {

  var $visbar = $("#barchart .container");
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

  var svg = d3.select("#barchart .container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    data.forEach(function(d) {
      d.Y = +d.Y || 0;
    });

    x.domain(data.map(function(d) { 

      if (d.XMask) {
        return d.XMask;
      }
      else {
        var format = $('#barchart [data-id="dateTimeFormat"]').val();
        return moment(d.X).isValid()
          ? moment(d.X).format(format).toString()
          : d.X
        ;
      }

    }));

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
}