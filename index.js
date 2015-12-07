#!/usr/bin/env node

//  main.js
//
//  ECMAScript 6, conforms to ECMA 2016 Javascript Standard.
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Hippo back-end server implementation
//
//  'use strict'; over the project due to ES6-dependent architecture!

'use strict'                                   //  ES6

var VERSION     = "1.1.0"

console.log('hippohttpd (v. ' + VERSION + ')\nType \'help\' to see help.\n')

var moment      = require('moment')                 //	Timing classes, moment.js
var now         = require('performance-now')        //	Benchmarking, performance measuring
var table       = require('text-table')             //	Console commands listing helper
var assert      = require('assert')                 //	C type assertion test
var argv        = require('yargs').argv             //	Run argument vector parser

//var Enrollment = require('./enrollment');         //  Root server account manager subroutine

var Analytics   = require('./analytics');           //  Analytics
var Util        = require('./utility');             //  Utilities

var Sync, Elephant

if (argv.mongodb) {
    console.log('Database option ' + '\'mongodb\''.info + ' selected')
    Sync = require('./mongodb/sync')
    Sync.init(argv.mongodb)
} else if (argv.sql) {
    console.log('Database option ' + '\'sql\''.info + ' selected')
    Sync = require('./sql/sync')               //  Root server schedule synchronization subroutine, Sequelize.js kernel
    Elephant = require('./sql/elephant')       //  ORM assistant
} else if (argv.dynamodb) {
    console.log('Database option ' + '\'dynamodb\''.info + ' selected')
    Sync = require('./dynamodb/sync')          //  Root server schedule synchronization subroutine, AWS DynamoDB kernel
} else {
    console.log('usage:     node . --mongodb <url>           or')
    console.log('           node . --dynamodb                or')
    console.log('           node . --sql     <port number>   or')
    console.log('fatal:     no database option given')

    process.exit()
}

//  Debug trigger
var debug = true;
if (!argv.port) console.log('No port specified, defaults to 3000.'.verbose)
require('./routes').start(argv.port)               //  Main routes controller

process.stdin.setEncoding('utf8');
process.stdin.on('readable', function() {
    var chunk = process.stdin.read();

    if (chunk !== null) {
        var argv = chunk.split(' ');

        switch (argv[0].trim()) {
            case 'build':
                Sync.build(function (err, result) {
                    if (err) console.error(err)
                    else if (debug) console.log(result)

                    if (!err) Util.log('Successfully built.')
                })
                break

            case 'destroy':
                Sync.destroy(function (err, result) {
                    if (err) console.error(err);
                    else if (debug) console.log(result);

                    if (!err) Util.log('Successfully destroyed.');
                })
                break

            case 'push':
                Sync.push(function (err) {
                    if (err) console.error(err)
                    else Util.log('Successfully renewed.')
                })
                break
            case 'pull':
                Sync.pull(argv[1].trim(), function (err, results) {
                    if (err) console.error(err)
                    else Util.log(results)
                })

            case 'stats':
                Sync.stats();
                break

            case 'get':
                Sync.get(argv[1].trim(), function (err, results) {
                    if (err) console.error(err)
                    else Util.log(results)
                })
                break

            case 'find':
                Sync.query(argv[1].trim(), function (err, results) {
                    if (err) console.error(err)
                    else {
                        console.log(results)
                    }
                })
                break

            case 'count':
                Sync.count(function (err, rawSections, analytics) {
                    if (err) console.error(err);
                    else {
                        console.log('RawSections: ' + rawSections)
                        console.log('Analytics: ' + analytics)
                    }
                })
                break

            case 'list':
                Sync.count(function (err, rawSections, analytics) {
                    if (err) console.error(err);
                    else {
                        Sync.list(function (err, result) {
                            if (err) console.error(err)
                            else if (result.length) {
                                Util.log('Current collections ->')
                                console.log('                                         1. RawSections     : ' + rawSections)
                                console.log('                                         2. Analytics       : ' + analytics)
                            } else {
                                Util.log('No collection to show.')
                            }
                        })
                    }
                })

                break

            case '_fetch':
                Sync.test.fetch(function (err, result, time) {
                    if (err) console.error(err)
                    else console.log(result, time)
                })
                break

            case 'debug':
                debug = !debug
                break

            case 'help':
                Util.flushConsole(function () {
                    Util.help()
                })
                break

            case 'quit':
                process.exit()
                break
        }
    }
});


