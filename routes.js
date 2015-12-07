//  routes.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Main routes controller

(function () {
    'use strict'

    module.exports.start = function (port) {
        var Sync = require('./mongodb/sync')

        var Hapi = require('hapi')

        var server = new Hapi.Server()

        server.connection({ port: port ? port:3000 })

        function courseWithCRN(request, reply) {
            Sync.get(request.params.string, function (err, results) {
                if (!err) {
                    if (results) {
                        reply(results)
                    } else {
                        reply({ error: 'RawSection with crn \'' + request.params.crn + '\' not found'})
                    }
                } else {
                    console.error(err)
                    reply(err)
                }
            })
        }

        server.route({
            method: 'GET',
            path: '/schedule/{crn}',
            handler: function (request, reply) {
                Sync.get(request.params.crn, function (err, results) {
                    if (!err) {
                        if (results) {
                            reply(results)
                        } else {
                            reply({
                                Error: 'RawSection with course reference number (CRN) \'' + request.query.string + '\' could not be found.',
                                Description: null,
                            })
                        }
                    } else {
                        console.error(err)
                        reply(err)
                    }
                })
            }
        })

        server.route({
            method: 'GET',
            path: '/schedule',
            handler: function (request, reply) {
                var isArgumentsValid = (request.query.string !== undefined || request.query.identifier !== undefined) && !(request.query.string !== undefined && request.query.identifier !== undefined)

                console.log(isArgumentsValid)
                console.log(request.query.string)
                console.log(request.query.identifier)

                if (isArgumentsValid && request.query.string !== undefined) {
                    Sync.resolveString(request.query.string, function (err, results) {
                        if (!err) {
                            if (results.length) {
                                reply(results)
                            } else {
                                reply({
                                    Error: 'RawSection with string \'' + request.query.string + '\' could not be found.',
                                    Description: null,
                                })
                            }
                        } else {
                            console.error(err)
                            reply(err)
                        }
                    })
                } else if (isArgumentsValid && request.query.identifier !== undefined) {
                    Sync.resolveIdentifier(request.query.identifier, function (err, results) {
                        if (!err) {
                            if (results.length) {
                                reply(results)
                            } else {
                                reply({
                                    Error: 'RawSection with identifier \'' + request.query.identifier + '\' could not be found.',
                                    Description: null,
                                })
                            }
                        } else {
                            console.error(err)
                            reply(err)
                        }
                    })
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
