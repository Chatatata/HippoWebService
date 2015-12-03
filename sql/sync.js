//  sync.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//    @description: Root server synchronization handler, based on Sequelize.js ORM with SQL dialect Postgres maintained

(function () {
    "use strict"

    //  Encapsulation

    //  renew()      -> Promise:()
    //
    //  Synchronizes the database with objects parsed from root server and schedules server subroutines
    //
    //  WARNING: Due to ORM architecture and crawling constraints, this function works slow.
    //           Server is stateless; therefore, if server renewed once in a schedule life-time, it shouldn't be renewed again.
    //
    //           See also: fpartial()

    module.exports.renew = function() {
        return renew();
    }

    //  fpartial()      -> Promise:()
    //
    //  Partially synchronizes the database, makes changes in Sections according to new data

    module.exports.fpartial = function(code) {
        return fpartial(code);
    }

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

    //  query()     -> Promise:(objects)
    //
    //  Executes query in database and returns objects

    module.exports.query = function() {
        return query;
    }

    //  count()     -> Promise:(integer)
    //
    //  Executes count in Sections table and returns the number of objects found at table.

    module.exports.count = function() {
        return count();
    }

    module.exports.debug = debug;
    
    var http = require("http");                                     //  HTTP requests
    var request = require("request");
    var moment = require("moment");                                 //  Timing classes, moment.js
    var htmlparser = require("htmlparser2");                        //  HTML parser
    var Iconv = require("iconv").Iconv;                             //  CP1254 decoder
    var now = require("performance-now");                           //  Benchmarking, performance measuring
    var scheduler = require("node-schedule");                       //  date-based scheduling
    var assert = require('assert');                                 //  C type assertion test
    var Q = require("q");                                           //  kriskowal/Q's Promises/A+ implementation

    var buildings = require("./static/Buildings.json");             //  Load static data
    var courseCodes = require("./static/CourseCodes.json");

    var Elephant = require("./elephant");
    var Util = require("./utility");

    var updating = false;
    var debug = false;

    var currentSchedule = {};
    var jobs = [];
    var syncStats = [];
    var startTime = null;

    //  Renew database
    function renew() {           startTime = now();
        return Elephant.destroy()
        .then(function () {
            return Elephant.build();
        })
        .then(function () {
            return Elephant.Schedule().create({ name: "201503", validUntil: new Date() })
        })
        .then(function (schedule) {
            currentSchedule = schedule;
            return Elephant.Building().sync();
        })
        .then(function () {
            //  Add buildings
            return Q.all(buildings.map(function (element) {
                return Elephant.Building().create({ shortName: element[0], longName: element[1], campus: element[2] });
            }))
        })
        .then(function (results) {
            buildings = results;
            //  Renew all course codes in parallel
            return Q.all(courseCodes.map(function (value) {
                return addCode(value);
            }));
        })
        .catch(function (err) {
            console.error(err);
        })
        .then(function () {
            if(firstTime.diff(moment()) <= 45000) {
                return Q.reject(Error("Time difference is lower than expected. Please recall renew after a minute."));
            } else if (jobs.length != courseCodes.length) {
                return Q.reject(Error("Scheduling subsystem inconsistency, panic: " + jobs.length + " jobs, " + courseCodes.length + " expected."));
            } else return Q.resolve();
        })
        .then(function () {
            syncStats.push(now() - startTime);
        })
        .then(function () {
            console.log(new Date() + ": Renew completed. Schedulers are set, database is now in sync.")
        });
    }
    
    function fpartial(string) {
        return updateCode(string)
        .then(function (results) {
            console.log(new Date() + ": " + string + " is successfully fetched.");
        })
        .catch(function (err) {
            console.error(err);
        }); 
    }

    var firstTime = null;       //  the time of next fetch queue start
    var lastTime = null;        //  the time of next fetch queue's last fetch start
    var fetchedCourses = 1;

    function addCode(string) {
        return fetch(string)
        //  Load the courses into the database
        .then(function (results) {
            return results.reduce(function (promise, row) {
                return promise.then(function () {
                    return addRow(row);
                });
            }, Q.resolve());
        });
    }

    var counter = 0;

    function addRow(row) {
        //  Query the course in Elephant
        return Elephant.Course().findAll({
            where: { code: row[1], number: row[2], isEnglish: row[3], title: row[4] },
            limit: 1
        })
        .then(function (courses) {
            if (courses.length == 0) {
                return Elephant.Course().create({
                    code: row[1], number: row[2], isEnglish: row[3], title: row[4], prerequisites: [], classRestriction: [], scheduleId: currentSchedule.id});
            } else {
                return (courses[0]);
            }
        })
        .catch(function (error) {
            console.error(row + error);
            
            return Q.reject(Error("CourseFindError"));
        })
        .then(function (course) {
            //  Add section to the course
            return Elephant.Section().create({
                crn: row[0], instructor: row[5], capacity: row[10], enrolled: row[11], reservation: row[12], majorRestriction: row[13], courseId: course.id
            });
        })
        .catch(function (error) {
            console.error(row + error);
            
            return Q.reject(Error("CourseCreateError"));
        })
        .then(function (section) {
            var buildingIds = [];

            for (var eachBuildingInRow of row[6]) {
                for (var eachBuildingInList of buildings) {
                    if (eachBuildingInList.shortName == eachBuildingInRow) {
                        buildingIds.push(eachBuildingInList.id);

                        if (buildingIds.length == row[6].length) {
                            buildingIds.push(section.crn);
                            Q.resolve(buildingIds);
                        }
                    }
                }
            }

            return Q.resolve(buildingIds);
        })
        .catch(function (error) {
            console.error(row + error);
            
            return Q.reject(Error("SectionCreateError"));
        })
        .then(function (buildingIds) {
            var promises = [];

            var crn = buildingIds.pop();

            for (var i = 0; i < buildingIds.length; ++i) {
                promises.push(Elephant.Lesson().create({
                    weekday: row[7],
                    startTime: 0,
                    endTime: 0,
                    sectionCrn: crn,
                    place: {
                        buildingId: buildingIds[i],
                        room: row[9][i]
                    }
                }, {
                    include: [ Elephant.Place() ]
                }));
            }

            return promises;
        })
        .catch(function (error) {
            console.error(error);
            
            return Q.reject(Error("LessonCreateError"));
        })
    }
    
    function updateCode(string) {
        if (string === "-all") {
            return Q.all(courseCodes.map(function (value) {
                return fpartial(value);
            }));
        } else {
            return fetch(string)
            //  Update the courses
            .then(function (results) {
                return results.reduce(function (promise, row) {
                    return promise.then(function () {
                        return updateRow(row);
                    });
                }, Q.resolve());
            })
        }
    }

    function updateRow(row) {
        return Elephant.Section().update({
            capacity: row[10], enrolled: row[11], reservation: row[12]
        }, {
            where: { crn: row[0] }
        }).catch(function (err) {
            console.error(row + err);
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

    function count() {
        return Elephant.Course().count();
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

    function fetch(string) {
        var deferred = Q.defer();
        //  Make HTTP request to get HTML data
        request({ url: "http://www.sis.itu.edu.tr/tr/ders_programlari/LSprogramlar/prg.php", qs: { "fb": string }, encoding: null }, function (error, response, body) {
            if (error) {
                return fetch(string);
                console.log(string + " with error " + error + ". Retrying...");
            } else {
                if (debug) {
                    console.log("Fetching: " + string);
                }
                const iconv = new Iconv("CP1254", "UTF-8");
                const data = iconv.convert(body);
                const dataString = data.toString();

                //  Parse date
                var trimmedDateString = dataString.substring(dataString.search("</b>") + 4, dataString.length);
                trimmedDateString = trimmedDateString.substring(0, trimmedDateString.search(" \t\r\n"));
                const date = moment(trimmedDateString, "DD-MM-yyyy / H:mm:ss");
                date.add(15, "m");
                date.add(3, "s");

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

                var outerArray = [];
                var innerArray = [];

                var counter = 0;
                var order = 0;
                var willDelete = false;
                
                //    Fetched raw row elements
                //
                //  [ '11699',
                //    'JEF',
                //    '111',
                //    true,
                //    'Intr.to Geophysical Eng.',
                //    'Mustafa Emin Demirbağ',
                //    [ 'MDB' ],
                //    'Cuma',
                //    '1030/1129',
                //    'A205',
                //    '80',
                //    '42',
                //    null,
                //    [ 'JEF', 'JEFE' ],
                //    null,
                //    null ]
                
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
                                innerArray.push(parseInt(text));
                            } else if (order == 1) {
                                //  Course code in format %'BLG' %212 %true
                                innerArray.push(text.substring(0, 3));
                                innerArray.push(parseInt(text.substring(4, 7)));
                                innerArray.push(text.charAt(7) == "E");
                            } else if (order == 2 || order == 3) {
                                //  Title and instructor name(s)
                                innerArray.push(text);
                            } else if (order == 4) {
                                //  Building codes
                                innerArray.push(text.split(" "));
                            } else if (order == 5) {
                                //  Weekday
                                try {
                                    var weekdays = weekday(text.split(" "));
                                } catch (err) {
                                    console.error(err + ", coursespace: " + string + ", crn:" + innerArray[0]);
                                } finally {
                                    innerArray.push(weekdays);
                                }
                            } else if (order == 6) {
                                //  Time
                                //  TODO: Time parsing.
                                innerArray.push(text);
                            } else if (order == 7) {
                                //  Room nr.s
                                innerArray.push(text.split(" "));
                            } else if (order == 8 || order == 9) {
                                //  Capacity, enrolled
                                innerArray.push(parseInt(text));
                            } else if (order == 10) {
                                //  Reservation
                                if (text === "Yok/None") {
                                    innerArray.push(null);
                                } else {
                                    innerArray.push(text);
                                }
                            } else if (order == 11) {
                                //  Major restrictions
                                if (text === "Yok/None") {
                                    innerArray.push(null);
                                } else {
                                    innerArray.push(text.split(", "));
                                }
                            } else if (order == 12) {
                                //  Prerequisites
                                if (text === "Yok/None") {
                                    innerArray.push(null);
                                } else {
                                    innerArray.push(text);
                                }
                            } else if (order == 13) {
                                //  Class restriction
                                if (text === "Diğer Şartlar") {
                                    return;
                                } else if (text === "Yok/None") {
                                    innerArray.push(false);
                                } else if (text === "4.Sınıf") {
                                    innerArray.push(4);
                                } else {
                                    var arr = text.split(", ");
                                    
                                    for (var i = 0; i < arr.length; ++i) {
                                        if (arr[i] !== "4.Sınıf" && arr[i] !== "3.Sınıf" && arr[i] !== "2.Sınıf" && arr[i] !== "1.Sınıf") {
                                            throw Error("Inconsistent class restriction string part: \"" + arr[i] + "\"");
                                        }
                                        
                                        arr[i] = arr[i].charAt(0);
                                    }
                                    
                                    innerArray.push(arr);
                                }
                                
                                //  Finalize
                                outerArray.push(innerArray);
                                
                                order = -1;
                                innerArray = [];
                            }
                            
                            order++;
                        }
                    }
                }, { decodeEntities: true });

                parser.write(trimmedString);
                parser.end();

                if ((firstTime != null && date.isBefore(firstTime)) || firstTime == null) {
                    //  First time.
                    firstTime = date;
                }

                if ((lastTime != null && date.isAfter(lastTime)) || lastTime == null) {
                    //  Last time.
                    lastTime = date;
                }

                if (debug) {
                    var endTime = now();
                    if (updating) {
                        console.log(string + " updated in " + (endTime - startTime).toFixed(2) + " msecs and will be renewed in " + date.diff(moment()) / (1000 * 60));
                    } else {
                        console.log(fetchedCourses++ + "/" + courseCodes.length + ": " + string + " added in " + (endTime - startTime).toFixed(2) + " msecs and will be renewed in " + date.diff(moment()) / (1000 * 60));
                    }
                }
                
                var job = scheduler.scheduleJob(string, date.toDate(), function () { return fpartial(string) }, jobs.push(job));
                
                var just = new Date()
                if (date - just <= 0) {
                    throw date + " is before than " + just;
                }

                deferred.resolve(outerArray);
            }
        });
        
        return deferred.promise;
    }

    function isCourseCode(string) {
        for (var eachCode of courseCodes) {
            if (eachCode == string) {
                return true;
            }
        }

        return false;
    }
    
    function weekday(input) {
        if (Object.prototype.toString.call(input) !== "[object Array]") {
            throw Error("Input is not string array: " + input.constructor);
        }
        
        var result = [];
        
        for (var i = 0; i < input.length; ++i) {
            if (input[i] === "Pazartesi") {
                result.push(0);
            } else if (input[i] === "Salı") {
                result.push(1);
            } else if (input[i] === "Çarşamba") {
                result.push(2);
            } else if (input[i] === "Perşembe") {
                result.push(3);
            } else if (input[i] === "Cuma") {
                result.push(4);
            } else if (input[i] === "Cumartesi") {
                result.push(5);
            } else if (input[i] === "Pazar") {
                result.push(6);
            } else if (input[i] === "----") {
                result.push(7);
            } else {
                throw Error("Raw value could not be converted to Weekday enum value. \"" + input[i] + "\"");
                result.push(-1);
            }
        }
        
        return result;
    }
    
    //
    //  Benchmarking
    //
    
    //  Fetching, HTTP requests, sockets and speed.
    
    module.exports._test_fetch = function () {
        return _test_fetch();
    }
    
    module.exports._test_fetchP = function () {
        return _test_fetchP();
    }
    
    function _test_fetch() {
        var keyframe = now();
        console.log(new Date() + ": HTTP request benchmark started.");
        
        return Q.all(courseCodes.map(_test_request))
        .then(function (results) {
            results = results.reduce(function (a, b) {
                return a + b;
            });
            
            var _test_FetchBenchmarkResult = {};
            _test_FetchBenchmarkResult.totalBytes = results;
            _test_FetchBenchmarkResult.totalElapsed = now() - keyframe;
            
            return Q.resolve(_test_FetchBenchmarkResult);
        })
    }
    
    function _test_fetchP() {
        return module.exports._test_fetch()
        .then(function (result) {
            console.log(new Date() + ": HTTP request benchmark completed, " + result.totalBytes + " bytes read in " + result.totalElapsed.toFixed(0) / 1000 + " seconds (avg. " + ((result.totalBytes / 1000) / result.totalElapsed).toFixed(4) + " MB/s).");
        });
    }
            
    function _test_request(string) {
        var deferred = Q.defer();
        
        request({ url: "http://www.sis.itu.edu.tr/tr/ders_programlari/LSprogramlar/prg.php", qs: { "fb": string }, encoding: null }, function (error, response, body) {
            if (error) {
                return _test_request(string);
            } else {
                deferred.resolve(response.socket.bytesRead);
            }
        });
        
        return deferred.promise;
    }
    
    //  SQL
    
    function _test_sql() {
        var deferred = Q.defer();
        
        
    }
    
    //  Validators
    
//    function _validate_courseCodes(code) {
//        return Elephant.
//    }
    
}());




























