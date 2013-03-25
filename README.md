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

Create keys and certs for the https server as well as a pfx file that can be 
used to establish a secure tls connection from a client to the server. In your
project make the directory `auth` and cd into into it. Remember to add the 
`passphrase.txt` file to your `.gitignore` file if you are going to check it in 
somewhere.
```bash
openssl genrsa -out levelweb-key.pem 1024
openssl req -new -key levelweb-key.pem -out levelweb-csr.pem
openssl x509 -req -in levelweb-csr.pem -signkey levelweb-key.pem -out levelweb-cert.pem
openssl pkcs12 -export -in levelweb-cert.pem -inkey levelweb-key.pem -certfile levelweb-cert.pem -out levelweb.pfx
echo "mypassphrase" > passphrase.txt
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
#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var tls = require('tls');

var options = {
  pfx: fs.readFileSync(path.join('auth', 'levelweb.pfx')),
  passphrase: fs.readFileSync(path.join('auth', 'passphrase.txt')).toString().trim()
};

var client;

function write(json) {
  client.write(JSON.stringify(json) + '\n');
  client.end();
}

client = tls.connect(9099, options, function() {
  write({
    key: "hello",
    value: {
      date: Date.now(),
      foo: "bar"
    }
  });
});
```

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
