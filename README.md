# SYNOPSIS
LevelDB Management. Includes simple data visualization tools.

# MOTIVATION

 - No need to configure your Data Retention.
 - Nothing needs to be finite or determined ahead of time.
 - No storage-schema configuration.
 - No database initialization. 
 - Attach to an existing database or create a new one by providing a path at the command line.
 - Accept incoming data streams via tls.
 - Single command installation process (`npm install levelweb`).

# USAGE
## Running the server
Create an initial user account
```bash
levelweb -u admin -p password
```

Create keys and certs for the https server as well as a pfx file that can be 
used to establish a secure tls connection from a client to the server.
```bash
cd auth
openssl genrsa -out levelweb-key.pem 1024
openssl req -new -key levelweb-key.pem -out levelweb-csr.pem
openssl x509 -req -in levelweb-csr.pem -signkey levelweb-key.pem -out levelweb-cert.pem
openssl pkcs12 -export -in levelweb-cert.pem -inkey levelweb-key.pem -certfile levelweb-cert.pem -out levelweb.pfx
echo "mypassphrase" > passphrase.txt
```

Point the app at your database and specify what ports you want to run on.
```bash
levelweb ./test/data --tls 9097 --https 8089
```

![screenshot](/screenshots/screenshot0.png)

## Sending data to the server
Level web accepts new line delimited writes over tls. Each line should be an 
object that contains a key and value, like so `{ key: 'foo', value: 'bar' }`.

```js
var options = {
  pfx: fs.readFileSync('levelweb.pfx'),
  passphrase: rs.readFileSync('passphrase.txt').toString()
};

var client;

function write(json) {
  client.write(JSON.stringify(json) + '\n');
}

client = net.connect(9097, options, function() {
  write({
    key: "hello",
    value: {
      date: Date.now()
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
