# build and start

start:
	browserify ./public/index.js > ./public/js/bundle.js && \
	./bin/levelweb -b && \
	./bin/levelweb ./sampledb

build:
	browserify ./public/index.js | uglifyjs > ./public/js/bundle.js && \
	./bin/levelweb -b

all:
	browserify ./public/index.js | uglifyjs > ./public/js/bundle.js && \
	./bin/levelweb -b && \
	./bin/levelweb ./sampledb

client:
	browserify ./public/index.js | uglifyjs > ./public/js/bundle.js && \
	./bin/levelweb -b && \
 	./bin/levelweb --client 9099