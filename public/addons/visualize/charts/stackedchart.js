
module.exports = function(data) {

  var $container = $("#stackedchart .container");

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
      //.tickFormat(formatPercent);

  var area = d3.svg.area()
      .x(function(d) { return x(d.X); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });

  var stack = d3.layout.stack()
      .values(function(d) { return d.values; });

  var svg = d3.select("#stackedchart .container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    color.domain(d3.keys(data[0]).filter(function(key) { return key !== "X"; }));

    data.forEach(function(d) {
      if ($('#stackedchart [data-id="dateTimeFormat"]').val().length > 0) {
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
          return { X: d.X, y: d[name] };
        })
      };
    }));

    x.domain(d3.extent(data, function(d) { return d.X; }));

    y.domain(
      [0, d3.max(data, function(d) { 

        var tmp = [];

        Object.keys(d).map(function(name) {
          if (name !== 'X') {
            tmp.push(d[name]);
          }
        });

        return d3.max(tmp);

      })]
    );

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