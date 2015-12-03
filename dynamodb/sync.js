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
    "use strict"

    //  qtime()
    //
    //  Logs the server's next temporary downtime dates.

    module.exports.qtime = function() {
        return qtime();
    }

    //  stats()
    //
    //  Logs the statistics of all subroutines executed in past.

    module.exports.stats = function() {
        return stats();
    }
    
    var os          = require("os")                                  //  OS-layer functions
     ,  fs          = require("fs")                                  //  File system
     ,  http        = require("http")                                //  HTTP requests
     ,  request     = require("request")                             //  Requests lib
     ,  uuid        = require("uuid")                                //  Rigorous implementation of RFC4122 (v1 and v4) UUIDs
     ,  moment      = require("moment")                              //  Timing classes, moment.js
     ,  htmlparser  = require("htmlparser2")                         //  HTML parser
     ,  Iconv       = require("iconv").Iconv                         //  CP1254 decoder
     ,  now         = require("performance-now")                     //  Benchmarking, performance measuring
     ,  scheduler   = require("node-schedule")                       //  date-based scheduling
     ,  assert      = require('assert')                              //  C type assertion test
     ,  async       = require("async")                               //  async helper library
     ,  AWS         = require("aws-sdk")                             //  Amazon Web Services node-js sdk
     ,  Sequelize   = require("sequelize")                           //  Postgres object relational mapping tool
     
     ,  Pool        = new Sequelize("postgres://hippo:anwD9fZUEn@hippo.c5w29b3i0p6x.eu-central-1.rds.amazonaws.com:5432")
    
    AWS.config.update({
        dynamoDbCrc32: false,
        region: "eu-central-1",
        sslEnabled: true,
    });
        
    var dynamodb    = new AWS.DynamoDB({apiVersion: '2012-08-10'})

    var buildings   = require("../static/Buildings");             //  Load static data
    var courseCodes = require("../static/CourseCodes");
    
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
                    TableName: "RawSections",
                    KeySchema: [
                        {
                            AttributeName: "crn",
                            KeyType: "HASH" 
                        },
                    ],
                    AttributeDefinitions: [
                        {
                            AttributeName: "crn",
                            AttributeType: "N"
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
		
	    }
    	})
    }
    
    
    
    module.exports.destroy = function (callback) {
        var params = {
            "TableName": "RawSections"
        };
        
        dynamodb.deleteTable(params, callback);
    }

    module.exports.renew = function (callback) {
        if (arguments.length == 1) {
            stopwatches[0] = now();
        
            async.eachSeries(courseCodes, addRows, callback);
        } else if (arguments.length == 2) {
            if (typeof arguments[0] !== "function") {
                throw Error("Invalid arguments.");
            }
            
            return addRows(arguments[0], callback);
        } else {
            return Error("Excessive number of arguments in function call.");
        }
    }
    
    module.exports.count = function(callback) {
        var params = {
            TableName: "RawSections",
        };
        
        dynamodb.describeTable(params, callback);
    }
    
    module.exports.list = function(callback) {
        return dynamodb.listTables(null, callback);
    }
    
    module.exports.get = function(crn, callback) {
        var params = {
            TableName: "RawSections",
            Key: {
                crn: {
                    N: crn + "",
                },
            },
            AttributesToGet: [
                "crn",
                "title",
                "instructor",
                "capacity",
                "enrolled",
            ],
        };
        
        dynamodb.getItem(params, callback);
    }
    
    var queue = []
    
    function emptyStatsQueue(callback) {
        if (stats.length) {
            var AWSRequestParams = {
                RequestItems: {
                    Stats: []
                },
            }
            
            while (stats.length) {
                var request = {
                    PutRequest: {
                        Item: {
                            
                        }
                    }
                }
            }
        }
    }

    function addRows(string, callback) {
        if (typeof string !== "string" || typeof callback !== "function") {
            throw Error("Invalid arguments.")
        }
        
        fetch(string, function (rows) {
            console.log(string + ", fetched, now writing to db.")
            
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
                    if (err.code === "UnknownError") {
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
            TableName: "RawSections",
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

    function qtime() {
        if (firstTime != null && lastTime != null) {
            console.log("[MAINTENANCE: offTime: '" + firstTime.format("hh:mm:ss a") + "' onTime: '" + lastTime.format("hh:mm:ss a") + "']");
            
            jobs.forEach(function (element, index, array) {
                console.log(element);
            });
        }
        else console.log("[MAINTENANCE: No task scheduled.]");
    }

    function query() {

    }

    function stats() {
        if (syncStats.length) {
            var totalElapsed = 0;

            for (var i = 0; i < syncStats.length; ++i) {
                console.log((i + 1) + ". performed in " + syncStats[i].toFixed(2) + " seconds.");
                totalElapsed += syncStats[i];
            }

            console.log("- Total elapsed: " + totalElapsed.toFixed(2) + " seconds.");
        } else {
            console.log("No syncs made until now.");
        }
    }

    function fetch(string, callback) {
        var stopwatches = [ now() ];
        
        if (typeof string !== "string" || typeof callback !== "function") {
            throw Error("Invalid arguments.");
        }
        
        //  Make HTTP request to get HTML data
        request({
            url: "http://www.sis.itu.edu.tr/tr/ders_programlari/LSprogramlar/prg.php",
            qs: { 
                "fb": string,
            },
            encoding: null,
        }, function (error, response, body) {
            if (error) {
                fetch(string, callback);
                
                console.log(new Date() + ": HTTP request cannot be resolved at string '" + string + "' resolved with error '" + error + "', retrying.");
            } else {
                stopwatches[0] = now() - stopwatches[0];        //  stopwatch lap: HTTP request response time
                const iconv = new Iconv("CP1254", "UTF-8");
                const data = iconv.convert(body);
                const dataString = data.toString();

                //  Parse date
                var trimmedDateString = dataString.substring(dataString.search("</b>") + 4, dataString.length);
                trimmedDateString = trimmedDateString.substring(0, trimmedDateString.search(" \t\r\n"));
                const date = moment(trimmedDateString, "DD-MM-yyyy / H:mm:ss");
                date.add(15, "m");
                date.add(3, "s");
                
                //  Check if parsed date shows past
                if (date - Date() <= 0) {
                    setTimeout(function () {
                        fetch(string, callback);
                    }, 3000);
                    
                    console.log(new Date() + ": Time inconsistency in parsed document, at '" + string + "' suspending for 3 seconds.");
                } else {
                    //  Parse courses
                    const firstRange = dataString.search("<table  class=dersprg>");
                    var trimmedString = dataString.substring(firstRange, dataString.length);
                    const secondRange = trimmedString.search("</table>");
                    trimmedString = trimmedString.substring(0, secondRange + 8);

                    var searchValue = trimmedString.search("<br>");

                    while (trimmedString.search("<br>") != -1) {
                        var searchValue = trimmedString.search("<br>");

                        trimmedString = trimmedString.substring(0, searchValue) + " " + trimmedString.substring(searchValue + 4, trimmedString.length);
                    }

                    trimmedString = trimmedString.split("");

                    for (var i = 0; i < trimmedString.length; i++) {
                        if (trimmedString[i] == '&') {
                            trimmedString[i] = '|';
                        }
                    }

                    trimmedString = trimmedString.join("");
                    
                    stopwatches[1] = now() - stopwatches[0];        //  stopwatch lap: dateParsing

                    var result = [];
                    var sectionObject = {};

                    var counter = 0;
                    var order = 0;
                    var willDelete = false;

                    var parser = new htmlparser.Parser({
                        ontext: function (text) {
                            ++counter;

                            if (counter >= 31 && text != " ") {
                                while(text.search("  ") != -1) {
                                    var searchValue = text.search("  ");

                                    text = text.substring(0, searchValue) + text.substring(searchValue + 1, text.length);
                                }

                                text = text.trim();

                                if (order == 0) {
                                    assert.equal(text.length, 5);
                                    //  CRN
                                    sectionObject.crn = {};
                                    sectionObject.crn.N = text;
                                } else if (order == 1) {
                                    //  Course code in format %'BLG' %212 %true
                                    sectionObject.code = {};
                                    sectionObject.code.S = text.substring(0, 3);

                                    sectionObject.number = {};
                                    sectionObject.number.N = text.substring(4, 7);
                                    sectionObject.isEnglish = {};
                                    sectionObject.isEnglish.BOOL = text.charAt(7) == "E";
                                } else if (order == 2) {
                                    //  Title
                                    sectionObject.title = {};
                                    sectionObject.title.S = text;
                                } else if (order == 3) {
                                    //  Instructor
                                    sectionObject.instructor = {};
                                    sectionObject.instructor.S = text;
                                } else if (order == 4) {
                                    //  Building codes
                                    sectionObject.buildingCodes = {};
                                    sectionObject.buildingCodes.L = [];
                                    
                                    text.split(" ").map(function (value) {
                                        sectionObject.buildingCodes.L.push({
                                            "S": value,
                                        })
                                    })
                                } else if (order == 5) {
                                    //  Weekday
                                    try {
                                        var weekdays = []
                                    } catch (err) {
                                        console.error(err + ", coursespace: " + string + ", crn:" + sectionObject.crn.N)
                                    } finally {
                                        sectionObject.weekdays = {}
                                        sectionObject.weekdays.L = []
                                        
                                        text.split(" ").map(function (value) {
                                            sectionObject.weekdays.L.push({
                                                "S": value,
                                            })
                                        })
                                    }
                                } else if (order == 6) {
                                    //  Time
                                    //  TODO: Time parsing.
                                    sectionObject.times = {};
                                    sectionObject.times.S = text;
                                } else if (order == 7) {
                                    //  Room nr.s
                                    sectionObject.rooms = {};
                                    sectionObject.rooms.L = [];
                                    
                                    text.split(" ").map(function (value) {
                                        sectionObject.rooms.L.push({
                                            "S": value,
                                        })
                                    })
                                } else if (order == 8) {
                                    //  Capacity
                                    sectionObject.capacity = {};
                                    sectionObject.capacity.N = text;
                                } else if (order == 9) {
                                    //  Enrolled
                                    sectionObject.enrolled = {};
                                    sectionObject.enrolled.N = text;
                                } else if (order == 10) {
                                    //  Reservation
                                    if (text === "Yok/None") {
                                        //  Do nothing
                                    } else {
                                        sectionObject.reservation = {};
                                        sectionObject.reservation.S = text;
                                    }
                                } else if (order == 11) {
                                    //  Major restrictions
                                    if (text === "Yok/None") {
                                        //  Do nothing.
                                    } else {
                                        sectionObject.majorRestriction = {};
                                        sectionObject.majorRestriction.L = [];
                                        
                                        text.split(" ").map(function (value) {
                                            sectionObject.majorRestriction.L.push({
                                                "S": value,
                                            })
                                        })
                                    }
                                } else if (order == 12) {
                                    //  Prerequisites
                                    if (text === "Yok/None") {
                                        //  Do nothing
                                    } else {
                                        sectionObject.prerequisites = {}
                                        sectionObject.prerequisites.S = text
                                    }
                                } else if (order == 13) {
                                    //  Class restriction
                                    if (text === "Diğer Şartlar") {
                                        return;
                                    } else if (text === "Yok/None") {
                                        //  Do nothing
                                    } else if (text === "4.Sınıf") {
                                        sectionObject.classRestriction = {}
                                        sectionObject.classRestriction.L = [{ "N": "4" }]
                                    } else {
                                        var searchValue = text.search(' ')
                                        
                                        while (searchValue != -1) {
                                            text = text.substring(0, searchValue) + text.substring(searchValue + 1, text.length)
                                            
                                            searchValue = text.search(' ')
                                        }
                                        
                                        var arr = text.split(",")
                                        
                                        sectionObject.classRestriction = {}
                                        sectionObject.classRestriction.L = []

                                        for (var i = 0; i < arr.length; ++i) {                                            
                                            if (arr[i] === "4.Sınıf" || arr[i] === "3.Sınıf" || arr[i] === "2.Sınıf" || arr[i] === "1.Sınıf") {
                                                sectionObject.classRestriction.L.push({ "N": arr[i].substring(0, 1) })
                                            } else {
                                                throw Error("Inconsistent class restriction string part: \"" + arr[i] + "\"")
                                            }
                                        }
                                    }

                                    //  Finalize
                                    result.push(sectionObject)

                                    order = -1;
                                    sectionObject = {}
                                }

                                order++;
                            }
                        }
                    }, { 
                        decodeEntities: true
                    })

                    parser.write(trimmedString)
                    parser.end()
                    
                    stopwatches[2] = now() - stopwatches[1];        //  stopwatch lap: sectionParsing

                    if ((firstTime != null && date.isBefore(firstTime)) || firstTime == null) {
                        //  First time.
                        firstTime = date;
                    }

                    if ((lastTime != null && date.isAfter(lastTime)) || lastTime == null) {
                        //  Last time.
                        lastTime = date;
                    }
                    
                    job.schedule();
                    
                    stopwatches[3] = now() - stopwatches[2];        //  stopwatch lap: scheduling

                    stats.push({
                        operation: {
                            fetch: {
                                string: string,
                                resultLength: result.length,
                                bytesRead: response.socket.bytesRead,
                            },
                        },
                        lapTimes: {
                            httpResponseTime: stopwatches[0],
                            dateParsing: stopwatches[1],
                            sectionParsing: stopwatches[2],
                            scheduling: stopwatches[3],
                        },
                    })
                    
                    console.log(stats[stats.length - 1]);

                    callback(result);
                }
            }
        });
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
            request({ url: "http://www.sis.itu.edu.tr/tr/ders_programlari/LSprogramlar/prg.php", qs: { "fb": string }, encoding: null }, function (error, response, body) {
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




























