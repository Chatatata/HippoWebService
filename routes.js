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

//    routes.js
//
//    @description: Main routes controller

(function () {
    'use strict'

    module.exports.start = function (port) {
        var Sync        = require('./mongodb/sync')
        var Parser      = require('./mongodb/scheduleParser')

        var Hapi        = require('hapi')

        var server = new Hapi.Server()

        server.connection({ port: port ? port:3000 })

        server.route({
            method: 'GET',
            path: '/schedule/{crn}',
            handler: function (request, reply) {
                Sync.db.collection('RawSections').find({ crn: parseInt(request.params.crn) }).limit(1).toArray(function (err, result) {
                    if (err) reply(err)
                    else if (result.length) {
                        reply(result[0])
                    } else {
                        reply({
                            Error: 'RawSection with course reference number (CRN) \'' + request.params.crn + '\' could not be found.',
                            Description: null,
                        })
                    }
                })
            }
        })

        server.route({
            method: 'GET',
            path: '/schedule',
            handler: function (request, reply) {
                var isArgumentsValid = (request.query.string !== undefined || request.query.identifier !== undefined) && !(request.query.string !== undefined && request.query.identifier !== undefined)

                if (isArgumentsValid && request.query.string !== undefined) {
                    Sync.db.collection('RawSections').createIndex({ title: 'text', instructor: 'text' }, function (err, result) {
                        if (err) reply(err)
                        else {
                            Sync.db.collection('RawSections').find({ $text: { $search: request.query.string } }).toArray(function (err, result) {
                                if (err) reply(err)
                                else if (result.length) {
                                    reply(result)
                                } else {
                                    reply({
                                        Error: 'RawSection with string \'' + request.query.string + '\' could not be found.',
                                        Description: null,
                                    })
                                }
                            })
                        }
                    })
                } else if (isArgumentsValid && request.query.identifier !== undefined) {
                    function callback(err, results) {
                        if (err) reply(err)
                        else if (results.length) {
                            reply(results)
                        } else {
                            reply({
                                Error: 'RawSection with identifier \'' + request.query.identifier + '\' could not be found.',
                                Description: null,
                            })
                        }
                    }

                    if (request.query.identifier.length > 3) {
                        var courseObject = Parser.parseIdentifier(request.query.identifier)

                        Sync.db.collection('RawSections').find({ code: courseObject.code, number: courseObject.number, isEnglish: courseObject.isEnglish }).toArray(callback)
                    } else if (string.length == 3) {
                        Sync.db.collection('RawSections').find({ code: request.query.identifier }).toArray(callback)
                    } else {
                        callback(Error('At least 3 characters needed to do identifier search.'))
                    }
                } else {
                    reply({
                        Error: 'Invalid API parameters',
                        Description: 'Both $string and $identifier could not be exist at the same time.'
                    })
                }
            }
        })

        var options = {
            opsInterval: 1000,
            reporters: [{
                reporter: require('good-console'),
                events: { log: '*', response: '*' }
            }, {
                reporter: 'good-http',
                events: { error: '*' },
                config: {
                    endpoint: 'http://prod.logs:3000',
                    wreck: {
                        headers: { 'x-api-key' : 12345 }
                    },
                },
            }],
        }

        server.register({
            register: require('good'),
            options: options
        }, function (err) {
            if (err) {
                console.error(err)
            }
            else {
                server.start(function () {
                    console.info('Server started at '.warn + server.info.uri + '.'.warn)
                })
            }
        })
    }
}())
