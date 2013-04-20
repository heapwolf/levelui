# SYNOPSIS
LevelDB Management. Includes simple data visualization tools.

# MOTIVATION

 - No need to configure Data Retention or storage-schemas.
 - Nothing needs to be finite or determined ahead of time.
 - No database initialization.
 - Attach to an existing database or create one on the fly.
 - Accept secure incoming data streams via tls.

# USAGE
## Run the server
Installation
```bash
npm install levelweb -g
```

Create an initial user account
```bash
levelweb -u admin -p password
```

Point the app at your database and specify what ports you want to run on and a
host if it should be anything other than `127.0.0.1`.
```bash
levelweb ./test/data --tls 9097 --https 8089 --host 165.125.122.142
```

![screenshot](/screenshots/screenshot0.png)

## Send data to the server
Level web accepts new line delimited writes over tls. Each line should be an 
object that contains a key and value, like so `{ key: 'foo', value: 'bar' }`.
```js
var tls = require('tls');
var path = require('path');
var fs = require('fs');

module.exports = function(server) {

  var origin;

  server.on('connection', function(data) {
    origin = data;
  });

  var authpath = path.join(process.cwd(), 'auth');

  var opts = {
    host: 'localhost',
    port: argv.port,

    key: fs.readFileSync(path.join(authpath, 'my-client-key.pem')),
    cert: fs.readFileSync(path.join(authpath, 'my-client-cert.pem')),
    ca: [fs.readFileSync(path.join(authpath, 'levelweb-cert.pem'))]
  };

  console.log('connecting to port %d', opts.port);

  var client = tls.connect(opts, function() {

    server.on('log', function(key, value) {

      var json = { key: key, value: value };

      client.write(JSON.stringify(json) + '\n');
    });
  });
};
```

You can copy the certificate that you need from the settings tab in the UI.

![screenshot](/screenshots/screenshot6.png)

## Explore and manage keys and values
![screenshot](/screenshots/screenshot.png)

## Visualizations

### Treemap
Provides a zoomable tree-map of the currently tagged keys. Treemaps display 
hierarchical (tree-structured) data as a set of nested rectangles. Each branch
of the tree is given a rectangle, which is then tiled with smaller rectangles 
representing sub-branches. A leaf node's rectangle has an area proportional to 
a specified dimension on the data. Often the leaf nodes are colored to show a 
separate dimension of the data.

When the color and size dimensions are correlated in some way with the tree 
structure, one can often easily see patterns that would be difficult to spot in 
other ways, such as if a certain color is particularly relevant. A second 
advantage of treemaps is that, by construction, they make efficient use of 
space. As a result, they can legibly display thousands of items on the screen 
simultaneously.

![screenshot](/screenshots/screenshot2.png)

### Stacked Bar Chart

![screenshot](/screenshots/screenshot5.png)

### Stacked Area Chart
Area charts are used to represent cumulated totals using numbers or percentages 
(stacked area charts in this case) over time. Use the area chart for showing 
trends over time among related attributes. The area chart is like the plot chart
except that the area below the plotted line is filled in with color to indicate 
volume.

When multiple attributes are included, the first attribute is plotted as a line 
with color fill followed by the second attribute, and so on.

![screenshot](/screenshots/screenshot3.png)
![screenshot](/screenshots/screenshot4.png)
