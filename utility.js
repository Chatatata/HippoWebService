#!/usr/bin/env node

//    Copyright (c) 2015 The Digital Warehouse
//
//
//
//    Permission is hereby granted, free of charge, to any person obtaining a copy
//    of this software and associated documentation files (the "Software"), to deal
//    in the Software without restriction, including without limitation the rights
//    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//    copies of the Software, and to permit persons to whom the Software is
//    furnished to do so, subject to the following conditions:
//
//
//
//    The above copyright notice and this permission notice shall be included in
//    all copies or substantial portions of the Software.
//
//
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
//    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//    THE SOFTWARE.

//    utility.js
//
//    @description: Command line utilities

(function () {
    'use strict'
    
    module.exports.process = function () {
        return process;
    }
    
    //
    var process = require('child_process');
    
    //	Console commands listing helper
    var table = require('text-table');
    
    module.exports.colors = require('colors')

    const cleanSheet = 'printf \'\\33c\\e[3J\'';
    
    module.exports.flushConsole = function (callback) {
        process.exec(cleanSheet, function(err, stdout, stderr) {
            if (err != null) {
                console.error(stderr);
                
                return callback(err);
            } else {
                console.log(stdout);
                
                return callback();
            }
        });
    }

    module.exports.help = function () {
        console.log(table([
            [ '     AWS', 'Hippo Web Server', 'v 1.1.0, build ()' ],
            [ '' ],
            [ '' ],
            [ '     COMMAND', 'DESCRIPTION', 'PARAMETERS (?: optional)' ],
            [ '' ],
            [ '  ┌┬ DATABASE MANAGEMENT'],
            [ '  │├┬ build', 'Create tables' ],
            [ '  ││├ destroy', 'Delete tables' ],
            [ '  ││├ renew', 'Renew tables and re-sync', '{string}?: Particular code' ],
            [ '  ││├ get', 'Get an item with \'%crn\'', '{crn}: Identifier' ],
            [ '  ││├ query', 'Make a query with JSON', '{json}: Query JSON' ],
            [ '  ││├ count', 'Get the number of entries' ],
            [ '  ││└ list', 'List all tables on AWS DynamoDB' ],
            [ '  │└ stats', 'Show stats' ],
            [ '  │' ],
            [ '  ├┬ AUTHENTICATION'],
            [ '  │├ auth', 'Authenticate to server', 'id password PIN' ],
            [ '  │└ newacc', 'Create a new account' ],
            [ '  │' ],
            [ '  ├┬ BENCHMARKING'],
            [ '  │├ _fetch', 'Measure root server sync HTTP requests' ],
            [ '  │└ _database', 'Measure database ORM with dummy raw data' ],
            [ '  │' ],
            [ '  ├┬ DEBUGGING'],
            [ '  │└ debug', 'Switch debug mode' ],
            [ '  │' ],
            [ '  └ quit', 'Quit' ]
        ]));
    }

    module.exports.colors.setTheme({
        silly: 'rainbow',
        input: 'grey',
        verbose: 'cyan',
        prompt: 'grey',
        info: 'green',
        data: 'grey',
        help: 'cyan',
        warn: 'yellow',
        debug: 'blue',
        error: 'red'
    })

    module.exports.log = function (string) {
        var dateString = new Date() + ": "

        console.log(dateString.info + string)
    }
}());

 
 
 
 
 
