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
     ,  http        = require('http')                                //  HTTP requests
     ,  request     = require('request')                             //  Requests lib
     ,  uuid        = require('uuid')                                //  Rigorous implementation of RFC4122 (v1 and v4) UUIDs
     ,  moment      = require('moment')                              //  Timing classes, moment.js
     ,  htmlparser  = require('htmlparser2')                         //  HTML parser
     ,  Iconv       = require('iconv').Iconv                         //  CP1254 decoder
     ,  now         = require('performance-now')                     //  Benchmarking, performance measuring
     ,  scheduler   = require('node-schedule')                       //  date-based scheduling
     ,  assert      = require('assert')                              //  C type assertion test
     ,  async       = require('async')                               //  async helper library
     ,  AWS         = require('aws-sdk')                             //  Amazon Web Services node-js sdk
     ,  Analytics   = require('../analytics')

    Analytics.commitRule = function (slice, callback) {
        var AWSRequestParams = {
            RequestItems: {
                Stats: slice,
            },
        }
    }
    
    AWS.config.update({
        dynamoDbCrc32: false,
        region: 'eu-central-1',
        sslEnabled: true,
    });
        
    var dynamodb    = new AWS.DynamoDB({apiVersion: '2012-08-10'})

    var buildings   = require('../static/Buildings');             //  Load static data
    var courseCodes = require('../static/CourseCodes');
    
    var stopwatches = [];
    var stats       = [];
    var jobs        = [];
    var firstTime   = null;       //  the time of next fetch queue start
    var lastTime    = null;        //  the time of next fetch queue's last fetch start
    
    
    //
    //  NoSQL table build-up
    //
    
    module.exports.build = function (callback) {     
        async.series({
            RawSections: function (callback) {
                var params = {
                    TableName: 'RawSections',
                    KeySchema: [
                        {
                            AttributeName: 'crn',
                            KeyType: 'HASH'
                        },
                    ],
                    AttributeDefinitions: [
                        {
                            AttributeName: 'crn',
                            AttributeType: 'N'
                        },
                    ],
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 20,
                        WriteCapacityUnits: 20
                    }
                }

                dynamodb.createTable(params, callback)
            },
            Stats: function (callback) {
                var params = {
                    TableName: 'Stats',
                    KeySchema: [
                        {
                            AttributeName: 'id',
                            KeyType: 'HASH',
                        },
                    ],
                    AttributeDefinitions: [
                        {
                            AttributeName: 'id',
                            AttributeType: 'N',
                        },
                    ],
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 3,
                        WriteCapacityUnits: 3,
                    }
                }

                dynamodb.createTable(params, callback)
            }
    	}, callback)
    }
    
    
    
    module.exports.destroy = function (callback) {
        var params = {
            'TableName': 'RawSections'
        };
        
        dynamodb.deleteTable(params, callback);
    }

    module.exports.renew = function (callback) {
        if (arguments.length == 1) {
            stopwatches[0] = now()
        
            async.eachSeries(courseCodes, addRows, callback);
        } else if (arguments.length == 2) {
            if (typeof arguments[0] !== 'function') {
                throw Error('Invalid arguments.');
            }
            
            return addRows(arguments[0], callback);
        } else {
            return Error('Excessive number of arguments in function call.');
        }
    }
    
    module.exports.count = function(callback) {
        var params = {
            TableName: 'RawSections',
        };
        
        dynamodb.describeTable(params, callback);
    }
    
    module.exports.list = function(callback) {
        return dynamodb.listTables(null, callback);
    }
    
    module.exports.get = function(crn, callback) {
        var params = {
            TableName: 'RawSections',
            Key: {
                crn: {
                    N: crn + '',
                },
            },
            AttributesToGet: [
                'crn',
                'title',
                'instructor',
                'capacity',
                'enrolled',
            ],
        };
        
        dynamodb.getItem(params, callback);
    }
    
    var queue = []

    function addRows(string, callback) {
        if (typeof string !== 'string' || typeof callback !== 'function') {
            throw Error('Invalid arguments.')
        }
        
        fetch(string, function (rows) {
            console.log(string + ', fetched, now writing to db.')
            
            multipleBatchWrite(rows, 25, function (err) {
                if (queue.length) {
                    async.each(queue, dynamodb.batchWriteItem, callback)
                } else {
                    callback(err)
                }
            })
        })
    }
    
    function multipleBatchWrite(rows, quantity, callback) {
        var AWSRequestParams = {
            RequestItems: {
                RawSections: []
            },
        }, deleted
        
        if (rows.length > quantity) {
            deleted = rows.splice(0, quantity)
        } else {
            deleted = rows;
        }
        
        while (deleted.length) {
            var request = {
                PutRequest: {
                    Item: null,
                },
            }
            
            request.PutRequest.Item = deleted.pop()
            AWSRequestParams.RequestItems.RawSections.push(request)
        }
        
        console.log(AWSRequestParams)
        
        if (AWSRequestParams.RequestItems.RawSections.length) {
            dynamodb.batchWriteItem(AWSRequestParams, function (err, data) {
                if (err) {
                    if (err.code === 'UnknownError') {
                        queue.push(AWSRequestParams)
                    } else {
                        callback(err);
                    }
                }

                if (rows.length) {
                    multipleBatchWrite(rows, quantity, callback)
                } else {                    
                    callback(null)
                }
            })
        } else {
            callback(null)
        }
    }
    
    function updateOne(row, callback) {
        var params = {
            TableName: 'RawSections',
            Key: {
                crn: {
                    N: row.crn,
                },
            },
            AttributeUpdates: {
                capacity: {
                    N: row.capacity,
                },
                enrolled: {
                    N: row.enrolled,
                },
                reservation: {
                    S: row.reservation,
                },
            },
        };

        return dynamodb.updateItem(params, callback);
    }

    function updateRows(string, callback) {
        return fetch(string, function (err, rows) {      
            async.each(rows, updateOne, callback);            
        });
    }

    function query() {

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
            if (eachCode == string) {
                return true;
            }
        }

        return false;
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




























