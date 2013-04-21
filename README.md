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

Point the app at your database. Optionally specify ports for `--tls` and
`--https` and the hostname or IP with `--host`.
```bash
levelweb ./test/data
```

![screenshot](/screenshots/screenshot0.png)

## Send data to the server
Level web accepts new-line-delimited data via tls. Each line should be an 
object that contains a key and value, like `{ key: 'foo', value: 'bar' }`.
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

    key: fs.readFileSync(path.join(authpath, 'client-key.pem')),
    cert: fs.readFileSync(path.join(authpath, 'client-cert.pem')),
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

To generate a client key and a self signed certificate, you can try the following.
```bash
openssl genrsa -out client-key.pem 1024
openssl req -new -key client-key.pem -out client-csr.pem
openssl x509 -req -in client-csr.pem -signkey client-key.pem -out client-cert.pem
```

To connect to a server, supply a valid certificate. The CA can be copied from 
the `./auth` directory where you run levelweb or from the settings section in 
the UI.

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
