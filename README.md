# NAME
levelweb(3)

# SYNOPSIS
A GUI for LevelDB management. Includes visualization tools [WIP]

# MOTIVATION

 - No need to configure your Data Retention.
 - Nothing needs to be finite or determined ahead of time.
 - No storage-schemas configuration.
 - No database initialization. 
 - Attach to an existing database or create a new one by providing a path at the commandline.
 - Accept incoming data streams via tcp.

 - Node is the only significant dependency.
 - Single command installation process (`npm install levelweb`).

# USAGE
Point the app at your database and specify what ports you want to run on.
```bash
./bin/levelweb ./test/data --tcp 9997 --http 8080
```

## Streaming data to Levelweb
Level web accepts new line delimited writes over tcp. Each line should be an 
object that contains a key and value, like so `{ key: 'foo', value: 'bar' }`.

## Explore and manage keys and values
![screenshot](/screenshot.png)

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

![screenshot](/screenshot2.png)

### Time Series

![screenshot](/screenshot5.png)

### Stacked Area
Area charts are used to represent cumulated totals using numbers or percentages 
(stacked area charts in this case) over time. Use the area chart for showing 
trends over time among related attributes. The area chart is like the plot chart
except that the area below the plotted line is filled in with color to indicate 
volume.

When multiple attributes are included, the first attribute is plotted as a line 
with color fill followed by the second attribute, and so on.

![screenshot](/screenshot3.png)
![screenshot](/screenshot4.png)
