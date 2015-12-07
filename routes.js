//  routes.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Main routes controller

(function () {
    'use strict'

    module.exports.start = function (port) {
        var Hapi = require('hapi')

        var server = new Hapi.Server()

        module.exports.add = function (route) {
            server.route(route)
        }

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
    
        server.connection({ port: port ? port:3000 })

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
