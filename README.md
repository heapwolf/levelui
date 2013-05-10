# SYNOPSIS
A LevelDB GUI. Includes simple data visualization tools.

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

Point levelweb at your database or a leveldb instance running multilevel. 

```bash
levelweb ./test/data
```

```bash
levelweb --client 9099 --host 192.168.0.1
```

![screenshot](/screenshots/screenshot0.png)

## Send data to the server
You can connect to levelweb using the [multilevel][0] API. This is the exact
same API as [levelup][1] but it magically works over the network.

### Using Node.js
```js
var client = require('multilevel').client();
var net = require('net');

var myPort = 8089; // the port on which your database is running.

//
// connect the client 
//
client.pipe(net.connect(myPort)).pipe(client)

// asynchronous methods
client.get('foo', function () { /* */ });

// streams
client.createReadStream().on('data', function () { /* */ });
```

## COMMANDLINE PARAMETERS

### Data
```
--protocol <p>  specify the protocol where `p` is `tls` or `tcp`
--in <n>        specify a port for inbound data where `n` is a number
--out <n>       specify a port for outbound data where `n` is a number


```
--client        connect to a port and host using `--in` and `--host`
```

### Alternative Inputs

Level web accepts new-line-delimited data. Each line should be an object that 
contains a key and value, like `{ key: 'foo', value: 'bar' }`. To send data in 
this way, you need to specify the `--newline` option on the command line.

If you use `tls` as your protocol, you'll need to supply the server's 
certificate (you can copy this from the UI's settings tab) and generate a 
private key with a self signed certificate.

```bash
openssl genrsa -out client-key.pem 1024
openssl req -new -key client-key.pem -out client-csr.pem
openssl x509 -req -in client-csr.pem -signkey client-key.pem -out client-cert.pem
```

```
--newline       alternatively receive newline delimited streams.
```

### User Interface
```
--https <n>     a port for the web-server/user-interface to run on
--host <h>      ip or hostname for the web server if not localhost
```

### User Management
```
-u <username>   specify a username to create or check for
-p <password>   specify a password for the given username
```

### Misc
```
-c              regenerate private key and certificate for server
-b              compile all of the addon css and html
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

## DEVELOPER NOTES

### How the code is organized

### `bin`
Contains an executable file responsible for starting the app and passing 
parameters to the levelweb module. Yes, you can add levelweb on top of your 
database project.

### `lib`
Contains all of the server code. The index file is the point of entry and 
handles static file serving as well as communication to and from the server.




[0]:https://github.com/juliangruber/multilevel
[1]:https://github.com/rvagg/node-levelup
