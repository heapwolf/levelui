*ramp-resources* backed web server
------------------------------------

This examples shows how you can use ramp-resources to build a simple web
server that serves files, inlined resources and other things.

To run the sample app, first start the server:

    node server.js [port]

The port is optional and defaults to 8090. To publish some content on the
server, use the `publish.js` script with a JSON file that specifies a resource
set. Two such sets are provided as an example:

    node publish.js small.json /small

This will make the content described in small.json available on the server
through it's designated context path (`/resources`) and the mount point
(e.g. `/small`). Note that the publish script informs you roughly how many bytes
it's transferring. This is useful to know, because the server also caches
resources published to it.

The "small" resource set simply contains the server script itself. View it with
cURL:

    curl http://localhost:8090/resources/small/server.js

Observe that the server has cached the resource too:

    curl http://localhost:8090/cache

Now let's publish another, slightly larger resource set:

    node publish.js medium.json /medium

This set contains several files of various kinds, illustrating how
ramp-resources is capable of handling binary as well as text files, assigning
sensible default mime types and more. Browse the resource set at
<a href="http://localhost:8090/resources/medium/">http://localhost:8090/resources/medium/</a>.

To observe the caching behavior, try publishing one of the resource sets again:

    node publish.js medium.json /medium

You'll note that it reports publishing far fewer bytes than the first time. The
reason is that since none of the resources changed since we last pushed them to
the server, they are not actually transferred over. In fact, ramp-resources
goes to great lengths to not even read the files from disk. In their place,
ramp-resources uses the cache identifier to refer to one of the cached
resources on the server.

Note that the caching behavior is completely optional on both the client and
server side.
