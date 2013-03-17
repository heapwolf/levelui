# NAME
levelweb(3)

# SYNOPSIS
A web based interface for leveldb, with some other neat stuff.

# EXAMPLES
```bash
./bin/levelweb ./test/data
```

## Explore and manage keys and values
![screenshot](/screenshot.png)

## Out of the box visualizations

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

### Write History

### Stacked Area
