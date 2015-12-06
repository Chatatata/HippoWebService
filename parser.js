(function () {
    module.exports.fetch(string, callback) {
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
                module.exports.fetch(string, callback);

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
                        module.exports.fetch(string, callback);
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
})
