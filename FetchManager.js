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
//    @description: Root server synchronization handler, based on MongoDB.

(function () {
    'use strict'

    var os                  = require('os')                                  //  OS-layer functions
     ,  fs                  = require('fs')                                  //  File system
     ,  request             = require('request')                             //  Requests lib
     ,  uuid                = require('uuid')                                //  Rigorous implementation of RFC4122 (v1 and v4) UUIDs
     ,  now                 = require('performance-now')                     //  Benchmarking, performance measuring
     ,  scheduler           = require('node-schedule')                       //  date-based scheduling
     ,  mongoose            = require('mongoose')                            //  mongoose

    //  Model classes
     ,  User                = require('./models/User')
     ,  Credentials         = require('./models/Credentials')
     ,  Section             = require('./models/Section')

    //  Parser classes
     ,  ScheduleParser      = require('./ScheduleParser')
     ,  PortalParser        = require('./PortalParser')

    //  Static data
     ,  buildings           = require('./static-content/Buildings')
     ,  courseCodes         = require('./static-content/CourseCodes')
     ,  async               = require('async')                               //  async helper library

    mongoose.connection.on('error', console.error.bind(console, 'connection error: '))

    module.exports.init = mongoose.connect

    module.exports.deleteAllObjects = function (callback) {
        async.series({
            Users: function (callback) {
                User.remove({}, callback)
            },
            Sections: function (callback) {
                Section.remove({}, callback)
            }
        }, callback)
    }

    module.exports.countCollections = function(callback) {
        async.series({
            Users: function (callback) {
                User.count({}, callback)
            },
            Sections: function (callback) {
                Section.count({}, callback)
            }
        }, callback)
    }

    //  Schedule collection operations
    module.exports.updateSchedule = function (string, callback) {
        var isArgumentsValid = typeof string === 'string' && typeof callback === 'function'

        if (isArgumentsValid) {
            if (string === 'all') {
                async.each(courseCodes, updateRows, callback)
            } else if (isCourseCode(string)) {
                updateRows(string, callback)
            }
        } else {
            throw Error('Invalid arguments')
        }
    }

    //  Users collection operations
    module.exports.challenge = function (credentials, callback) {
        credentials.fetch(function (err, user) {
            if (err) callback(err)
            else user.save(callback)
        })
    }

    module.exports.renewOne = function (string, callback) {
        ScheduleParser(string, function (err, sections) {
            if (err) callback(err)
            else Section.collection.insert(sections, callback)
        })
    }

    module.exports.renewAll = function (string, callback) {
        var sections = {}

        async.each(courseCodes, function (string, callback) {
            ScheduleParser(string, function (err, sections) {
                sections.forEach(function (element) {
                    sections.push(element)
                })

                callback()
            })
        }, function (err) {
            if (err) callback(err)
            else {
                Section.collection.insert(sections, callback)
            }
        })
    }

    //
    //  Benchmarking
    //

    //  Fetching, HTTP requests, sockets and speed.

    module.exports.test = {}
    module.exports.test.fetch = function (callback) {
        var bytesRead = 0;
        var sw = now();

        var httpRequest = function (string, callback) {
            request({ url: 'http://www.sis.itu.edu.tr/tr/ders_programlari/LSprogramlar/prg.php', qs: { 'fb': string }, encoding: null }, function (error, response, body) {
                if (error) {
                    return httpRequest(string, callback)
                } else {
                    bytesRead += response.socket.bytesRead

                    callback(null);
                }
            });
        }

        async.each(courseCodes, httpRequest, function (err) {
            return callback(err, bytesRead, now() - sw);
        });
    }
}());




























