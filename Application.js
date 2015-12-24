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

//    Application.js
//
//    ECMAScript 6, conforms to ECMA 2016 Javascript Standard.
//
//    Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//    thedigitalwarehouse.com
//
//    @description: Hippo back-end server implementation
//
//    'use strict'; over the project due to ES6-dependent architecture!

(function () {
    'use strict'

    var packageInfo     = require('./package.json')         //  Package file
    var config          = require('./config.json')          //  Config file

    console.log('hippohttpd (v. ' + packageInfo.version + ')\nType \'?\' to see help, \'.exit\' to exit.\n')

    var argv            = require('yargs').argv             //	Run argument vector parser

    //  Model classes
     ,  User                = require('./models/User')
     ,  Credentials         = require('./models/Credentials')
     ,  Section             = require('./models/Section')

    var Util            = require('./Utility')

    var FetchManager    = require('./FetchManager')

    module.exports = function () {
        if (!argv.test) FetchManager.init(config.mongodb.url)

        require('./RouteController').start(config.hapi.port)               //  Main routes controller

        var readline = require('readline')

        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.on('line', function (chunk) {
            if (chunk !== null) {
                var argv = chunk.split(' ')

                argv.forEach(function (element) { element.trim() })

                switch (argv[0]) {
                    case 'db.deleteAll':
                        FetchManager.deleteAll(function (err) {
                            if (err) console.error(err)
                            else Util.log('Successfully destroyed.')
                        })
                        break

                    case 'db.list':
                        FetchManager.countCollections(function (err, results) {
                            if (err) console.error(err)
                            else console.log(results)
                        })
                        break

                    case 'schedule.update':
                        FetchManager.updateSchedule(argv[1], function (err, result) {
                            if (err) console.error(err)
                            else Util.log('Successfully updated.')
                        })
                        break

                    case 'section.get':
                        Section.find(JSON.parse(argv[1]), function (err, section) {
                            if (err) console.error(err)
                            else Util.log(section)
                        })
                        break

                    case 'user.register':
                        if (argv.length == 4) {
                            var credentials = {
                                username: argv[1],
                                password: argv[2],
                                PIN: argv[3],
                            }

                            Util.log(' Checking account information')
                            FetchManager.challenge(credentials, function (err) {
                                if (err) console.error(err)
                                else Util.log('Successfully challenged credential.')
                            })
                        } else {
                            Util.log(' Register Account')
                            Util.log(' Usage: [COMMAND] [username] [password] [PIN]')
                        }
                        break

                    case 'user.get':
                        if (argv.length == 2) {
                            Users.find({ id: argv[1] }).exec(function (err, user) {
                                if (err) console.error(err)
                                else console.log(user)
                            })
                        }

                    case 'test.fetch':
                        FetchManager.test.fetch(function (err, result, time) {
                            if (err) console.error(err)
                            else console.log(result, time)
                        })
                        break

                    case 'util.debug':
                        config.debug = !config.debug
                        break

                    case '?':
                        Util.flushConsole(function () {
                            Util.help()
                        })
                        break

                    case '.exit':
                        process.exit()
                        break

                    case '':
                        break

                    default:
                        console.log('Unrecognized command: ' + argv[0])
                }
            }
        })
    }
}())

