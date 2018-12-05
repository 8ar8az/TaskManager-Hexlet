install:
	npm install

run:
	npx babel-node -- src/bin/server.js

build:
	rm -rf dist
	npm run build

publish:
	rm -rf dist
	npm publish

test:
	npm test

lint:
	npx eslint .

.PHONY: test