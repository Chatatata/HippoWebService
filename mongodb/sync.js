//  sync.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//    @description: Root server synchronization handler, based on Amazon Web Services DynamoDB Javascript low-level API
//                  This module does not depend on an additional database manager module, unlike SQL version.
//
//      DynamoDB, raw.

(function () {
    'use strict'

    var os          = require('os')                                  //  OS-layer functions
     ,  fs          = require('fs')                                  //  File system
     ,  request     = require('request')                             //  Requests lib
     ,  uuid        = require('uuid')                                //  Rigorous implementation of RFC4122 (v1 and v4) UUIDs
     ,  now         = require('performance-now')                     //  Benchmarking, performance measuring
     ,  scheduler   = require('node-schedule')                       //  date-based scheduling
     ,  async       = require('async')                               //  async helper library
     ,  MongoClient = require('mongodb').MongoClient                 //  MongoDB driver
     ,  db          = null
//     ,  Analytics   = require('../analytics')
     ,  Parser      = require('./parser')

    var buildings   = require('../static/Buildings');             //  Load static data
    var courseCodes = require('../static/CourseCodes');

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

    module.exports.destroy = function (callback) {
        async.series({
            Sections: function (callback) {
                db.dropCollection('RawSections', callback)
            },
            Analytics: function (callback) {
                db.dropCollection('Analytics', callback)
            }
        }, callback)
    }

    module.exports.push = function (callback) {
        async.series({
            Sections: function (callback) {
                db.createCollection('RawSections', callback)
            },
            CRNIndex: function (callback) {
                db.collection('RawSections').createIndex({ crn: 1 }, { unique: true }, callback)
            },
            TextIndex: function (callback) {
                callback()
            },
            Analytics: function (callback) {
                db.createCollection('Analytics', callback)
            },
            Destroy: module.exports.destroy,
            Renew: function (callback) {
                async.each(courseCodes, addRows, callback)
            }
        }, callback)
    }

    module.exports.pull = function (string, callback) {
        var isArgumentsValid = typeof string === 'string' && typeof callback === 'function'

        if (isArgumentsValid) {
            if (string === 'all') {
                return async.each(courseCodes, updateRows, callback)
            } else if (isCourseCode(string)) {
                return updateRows(string, callback)
            }
        }

        throw Error('Invalid arguments')
    }

    module.exports.count = function(callback) {
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

    module.exports.list = function (callback) {
        db.listCollections().toArray(callback)
    }

    module.exports.get = function(crn, callback) {
        db.collection('RawSections').find({ crn: parseInt(crn) }).limit(1).toArray(callback)
    }

    module.exports.find = function (json, callback) {
        db.collection.find(json).toArray(callback)
    }

    function addRows(string, callback) {
        if (typeof string !== 'string' || typeof callback !== 'function') {
            throw Error('Invalid arguments.')
        }

        Parser.fetch(string, function (rows) {
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




























