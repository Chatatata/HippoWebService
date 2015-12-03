//  routes.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Main routes controller

(function () {
    "use strict"
    
    module.exports.server = function () {
        return server;
    }
    
    var Hapi = require("hapi");
    
    var server = new Hapi.Server();
    
    server.connection({ port: 3000 });
    
//    server.route({
//        method: "GET",
//        path: "/",
//        handler: function (request, reply) {
//            reply("Hello, world!");
//        }
//    });

    server.route({
        method: "GET",
        path: "/{name}",
        handler: function (request, reply) {
            reply("Hello, " + encodeURIComponent(request.params.name) + "!");
        }
    });
    
    //  Add external routes
    
    require("./routes/schedule.js").routes.forEach(function (element, index, array) {
        server.route(element);
    });
    
    var options = {
        opsInterval: 1000,
        reporters: [{
            reporter: require('good-console'),
            events: { log: '*', response: '*' }
        }, {
            reporter: require('good-file'),
            events: { ops: '*' },
            config: './test/fixtures/awesome_log'
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
    };
    
    module.exports.start = function () {
        return server.register({
            register: require('good'),
            options: options
        }, function (err) {
            if (err) {
                console.error(err);
            }
            else {
                server.start(function () {

                    console.info('Server started at ' + server.info.uri);
                });
            }
        });
    }
    
}());