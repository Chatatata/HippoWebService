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
     ,  async               = require('async')                               //  async helper library
     ,  MongoClient         = require('mongodb').MongoClient                 //  MongoDB driver
     ,  db                  = null
     ,  ScheduleParser      = require('./ScheduleParser')                    //  Schedule parser module
     ,  PortalParser        = require('./PortalParser')                      //  Portal parser module

    var buildings           = require('./static-content/Buildings')          //  Load static data
    var courseCodes         = require('./static-content/CourseCodes')

    var jobs        = [];

    //
    //  NoSQL table build-up
    //

    module.exports.init = function (url) {
        MongoClient.connect(url, function (err, database) {
            if (err) console.error('Could not connect to the server')
            else {
                console.log('Successfully connected to '.warn + url)
                module.exports.db = database
                db = module.exports.db
            }
        })
    }

    //  Database operations
    module.exports.dropAllCollections = function (callback) {
        async.series({
            Sections: function (callback) {
                db.dropCollection('RawSections', callback)
            },
            Analytics: function (callback) {
                db.dropCollection('Analytics', callback)
            }
        }, callback)
    }

    module.exports.rebuildAllCollections = function (callback) {
        async.series({
            Drop: function (callback) {
                module.exports.dropAllCollections(callback)
            },
            SectionsCreate: function (callback) {
                db.createCollection('RawSections', callback)
            },
            CRNIndex: function (callback) {
                db.collection('RawSections').createIndex({ crn: 1 }, { unique: true }, callback)
            },
            Analytics: function (callback) {
                db.createCollection('Analytics', callback)
            },
            Renew: function (callback) {
                async.each(courseCodes, addRows, callback)
            }
        }, callback)
    }

    module.exports.countCollections = function(callback) {
        var rawSectionsCollection = db.collection('RawSections')
        var analyticsCollection = db.collection('Analytics')

        rawSectionsCollection.count({}, function (err, count) {
            if (err) callback(err)
            else {
                analyticsCollection.count({}, function (err, count2) {
                    if (err) callback(err)
                    else {
                        callback(null, count, count2)
                    }
                })
            }
        })
    }

    module.exports.listCollections = function (callback) {
        db.listCollections().toArray(callback)
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

    module.exports.courseWithCRN = function(crn, callback) {
        db.collection('RawSections').find({ crn: parseInt(crn) }).limit(1).toArray(callback)
    }

    module.exports.findWithJSON = function (json, callback) {
        db.collection.find(json).toArray(callback)
    }

    module.exports.parseCourseIdentifier = function (text) {
        var courseObject = {}

        courseObject.code = text.substring(0, 3)
        courseObject.number = parseInt(text.substring(4, 7))
        courseObject.isEnglish = text.charAt(7) == 'E'

        return courseObject
    }

    //  Users collection operations
    module.exports.registerAccount = function (account, callback) {
        PortalParser.studentInformation(account, function (err, result) {
            if (err) callback(err)
            else {
                callback(err, result)
            }
        })
    }

    function addRows(string, callback) {
        if (typeof string !== 'string' || typeof callback !== 'function') {
            throw Error('Invalid arguments.')
        }

        ScheduleParser.fetch(string, function (err, rows) {
            if (rows.length) db.collection('RawSections').insertMany(rows, callback)
            else callback(null, null)
        })
    }

    function updateRows(string, callback) {
        fetch(string, function (err, rows) {
            rows.reduce(function (previous, current) {
                db.collection('RawSections').updateOne({ crn: previous.crn }, { $set: { capacity: previous.capacity, enrolled: previous.enrolled, reservation: previous.reservation } }, callback)
            })
//            db.collection('RawSections').updateMany({}, callback)
        })
    }

    function stats() {
        if (syncStats.length) {
            var totalElapsed = 0;

            for (var i = 0; i < syncStats.length; ++i) {
                console.log((i + 1) + '. performed in ' + syncStats[i].toFixed(2) + ' seconds.');
                totalElapsed += syncStats[i];
            }

            console.log('- Total elapsed: ' + totalElapsed.toFixed(2) + ' seconds.');
        } else {
            console.log('No syncs made until now.');
        }
    }

    function isCourseCode(string) {
        for (var eachCode of courseCodes) {
            if (eachCode === string) {
                return true
            }
        }

        return false
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




























