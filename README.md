# Hippo Web Service

Hippo Web Service is the back-end support service for Hippo.

> Hippo has no relationship by any means with Istanbul Technical University, and its sub-organizations. Use at your own risk.

### Features

  - Parsing course schedule and loading it to a database
  - Persistent synchronoucity with tasking
  - Analytics service to get detailed statistics
  - Some primitive benchmarking utilities in order to test the environment.

### Version
1.0.1 (nightly build)

### Stack

Hippo uses following packages or applications, currently:

* [node.js] - evented I/O for the backend
* [hapi.js] - fast node.js network app framework
* [async] - asynchronous control-flow library

> As I do not believe that promise implementations (i.e. Promises/A+, kriskowal's Q, bluebird etc.) are mature enough to be played with, I chose to write the code with callbacks.

### Installation

Just copy the entire repository, and run it with instructions supplied at the bottom of the page.

### Development

**A little help may rise us to skies!**

Hippo app uses Node.js v5.1.0 (stable) as platform.

Run the app with:
```sh
$ node main.js
```

You may also use Sequelize.js's SQL ORM for Node.js (not included), by adding `-sql` argument to the command line:
```sh
$ node main.js -sql
```

Or you may simply want to **verbose** debug output:
```sh
$ node main.js -debug
```

### Todos

 - Documentation, documentation, documentation...
 - Write unit tests
 - Scheduling
 - Account management
 - Portal interface

License
----

MIT

   
   [node.js]: <http://nodejs.org>
   [hapi.js]: <https://github.com/hapijs/hapi>
   [async]: <https://github.com/caolan/async#parallel>
   
   
