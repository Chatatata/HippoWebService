Hippo Web Service
----

[![Join the chat at https://gitter.im/Chatatata/HippoWebService](https://badges.gitter.im/Chatatata/HippoWebService.svg)](https://gitter.im/Chatatata/HippoWebService?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Hippo Web Service is the back-end support service for Hippo.

[![Build Status](https://travis-ci.org/Chatatata/HippoWebService.svg?branch=master)](https://travis-ci.org/Chatatata/HippoWebService)
[![Gitter](https://badges.gitter.im/Chatatata/HippoWebService.svg)](https://gitter.im/Chatatata/HippoWebService?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

> Hippo has no relationship by any means with Istanbul Technical University, and its sub-organizations. Use at your own risk.

### Features

  - Parsing course schedule and loading it to a database
  - Persistent synchronoucity with tasking
  - Analytics service to get detailed statistics
  - Some primitive benchmarking utilities in order to test the environment.

### Version
1.6.0 (nightly build)

### Stack

Hippo uses following packages or applications, currently:

* [node.js] - evented I/O for the backend
* [hapi.js] - fast node.js network app framework
* [async] - asynchronous control-flow library
* [mongoose] - elegant mongodb object modeling for node.js
* [cheerio] - fast, flexible, and lean implementation of core jQuery designed specifically for the server.

> I personally do not believe that promise implementations (i.e. Promises/A+, kriskowal's Q, bluebird etc.) are mature enough to be played with, I chose to write the code with callbacks.

### Installation

Just copy the entire repository, and run it with instructions supplied at the bottom of the page.

### Development

Hippo app uses Node.js v5.3.0 (stable) as platform. Hippo app currently has no issues with [nvm].

Run the app with (assuming you have a MongoDB server):
```sh
$ node . --db mongodb://localhost:27017/hippo
```

### Todos

 - Documentation, documentation, documentation...
 - Write unit tests
 - Scheduling
 - Account management
 - Portal interface
 
### Contribution

We feel completely free about contribution. Nonetheless, we have some significant styling rules one should obey them, owing to fluent communication between developers and supplying documentational consistency.

If you want to join us, you may check out [our Trello board] and [gitter chat]. Mail us to write there.

License
----

MIT

   
   [node.js]: <http://nodejs.org>
   [hapi.js]: <https://github.com/hapijs/hapi>
   [async]: <https://github.com/caolan/async#parallel>
   [nvm]: <https://www.npmjs.com/package/nvm>
   [MongoDB]: <https://www.mongodb.org>
   [our Trello board]: <https://trello.com/b/vgwiOvFh>
   [gitter chat]: <https://gitter.im/Chatatata/HippoWebService?utm_source=share-link&utm_medium=link&utm_campaign=share-link>
   [mongoose]: <http://mongoosejs.com>
   [cheerio]: <https://github.com/cheeriojs/cheerio>
