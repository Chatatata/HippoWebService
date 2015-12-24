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

//    ScheduleParser.js
//
//    @description: Schedule parser module

(function () {
    'use strict'

    var request             = require('request')                             //  Requests lib
     ,  now                 = require('performance-now')                     //  Benchmarking, performance measuring
     ,  Iconv               = require('iconv').Iconv                         //  CP1254 decoder
     ,  moment              = require('moment')                              //  Timing classes, moment.js
     ,  htmlparser          = require('htmlparser2')                         //  HTML parser
     ,  assert              = require('assert')                              //  C style assertion test

     ,  Section             = require('./models/Section')

     ,  courseCodes         = require('./static-content/CourseCodes.json')

    module.exports = function (string, callback) {
        if (typeof string !== 'string' || typeof callback !== 'function') {
            callback(Error('Invalid arguments.'))
        } else if (!Section.isValidCode(string)) {
            callback(Error(string + ' is not a valid course code.'))
        } else {
            //  Make HTTP request to get HTML data
            request({
                url: 'http://www.sis.itu.edu.tr/tr/ders_programlari/LSprogramlar/prg.php',
                qs: {
                    fb: string,
                },
                encoding: null,
            }, function (error, response, body) {
                if (error) {
                    module.exports(string, callback);

                    console.log(new Date() + ': HTTP request cannot be resolved at \'' + string + '\' with error \'' + error + '\', retrying.');
                } else {
                    const iconv = new Iconv('CP1254', 'UTF-8')
                    const data = iconv.convert(body)
                    const dataString = data.toString()

                    //  Parse date
                    var trimmedDateString = dataString.substring(dataString.search('</b>') + 4, dataString.length)
                    trimmedDateString = trimmedDateString.substring(0, trimmedDateString.search(' \t\r\n'))
                    const date = moment(trimmedDateString, 'DD-MM-yyyy / H:mm:ss')
                    date.add(15, 'm')
                    date.add(3, 's')

                    //  Check if parsed date shows past
                    if (date - Date() <= 0) {
                        setTimeout(function () {
                            module.exports(string, callback)
                        }, 3000)

                        console.log(new Date() + ': Time inconsistency in parsed document, at \'' + string + '\' suspending for 3 seconds.')
                    } else {
                        //  Parse courses
                        const firstRange = dataString.search('<table  class=dersprg>')
                        var trimmedString = dataString.substring(firstRange, dataString.length)
                        const secondRange = trimmedString.search('</table>')
                        trimmedString = trimmedString.substring(0, secondRange + 8)

                        var searchValue = trimmedString.search('<br>')

                        while (trimmedString.search('<br>') != -1) {
                            var searchValue = trimmedString.search('<br>')

                            trimmedString = trimmedString.substring(0, searchValue) + ' ' + trimmedString.substring(searchValue + 4, trimmedString.length)
                        }

                        trimmedString = trimmedString.split('')

                        for (var i = 0; i < trimmedString.length; i++) {
                            if (trimmedString[i] == '&') {
                                trimmedString[i] = '|'
                            }
                        }

                        trimmedString = trimmedString.join('')

                        var result = []
                        var sectionObject = new Section()

                        var counter = 0
                        var order = 0
                        var willDelete = false

                        var parser = new htmlparser.Parser({
                            ontext: function (text) {
                                ++counter

                                if (counter >= 31 && text != ' ') {
                                    while(text.search('  ') != -1) {
                                        var searchValue = text.search('  ')

                                        text = text.substring(0, searchValue) + text.substring(searchValue + 1, text.length);
                                    }

                                    text = text.trim()

                                    if (order == 0) {
                                        assert.equal(text.length, 5)
                                        //  CRN
                                        sectionObject.crn = parseInt(text);
                                    } else if (order == 1) {
                                        //  Course code in format %'BLG' %212 %true
                                        sectionObject.code = text.substring(0, 3)
                                        sectionObject.number = text.substring(4, 7)
                                        sectionObject.isEnglish = text.charAt(7) == 'E'
                                    } else if (order == 2) {
                                        //  Title
                                        sectionObject.title = text
                                    } else if (order == 3) {
                                        //  Instructor
                                        sectionObject.instructor = text
                                    } else if (order == 4) {
                                        //  Building codes
                                        sectionObject.buildingCodes = text.split(' ')
                                    } else if (order == 5) {
                                        //  Weekday
                                        sectionObject.weekdays = text.split(' ')
                                    } else if (order == 6) {
                                        //  Time
                                        //  TODO: Time parsing.
                                        sectionObject.times = text;
                                    } else if (order == 7) {
                                        //  Room nr.s
                                        sectionObject.rooms = text.split(' ')
                                    } else if (order == 8) {
                                        //  Capacity
                                        sectionObject.capacity = parseInt(text)
                                    } else if (order == 9) {
                                        //  Enrolled
                                        sectionObject.enrolled = parseInt(text)
                                    } else if (order == 10) {
                                        //  Reservation
                                        if (text === 'Yok/None') {
                                            //  Do nothing
                                        } else {
                                            sectionObject.reservation = text
                                        }
                                    } else if (order == 11) {
                                        //  Major restrictions
                                        if (text === 'Yok/None') {
                                            //  Do nothing.
                                        } else {
                                            sectionObject.majorRestriction = text.split(' ')
                                        }
                                    } else if (order == 12) {
                                        //  Prerequisites
                                        if (text === 'Yok/None') {
                                            //  Do nothing
                                        } else {
                                            sectionObject.prerequisites = text
                                        }
                                    } else if (order == 13) {
                                        //  Class restriction
                                        if (text === 'Diğer Şartlar') {
                                            return;
                                        } else if (text === 'Yok/None') {
    //                                        sectionObject.classRestriction = []
                                        } else if (text === '4.Sınıf') {
                                            sectionObject.classRestriction = [4]
                                        } else {
                                            var searchValue = text.search(' ')

                                            while (searchValue != -1) {
                                                text = text.substring(0, searchValue) + text.substring(searchValue + 1, text.length)

                                                searchValue = text.search(' ')
                                            }

                                            var arr = text.split(',')

                                            sectionObject.classRestriction = []

                                            for (var i = 0; i < arr.length; ++i) {
                                                if (arr[i] === '4.Sınıf' || arr[i] === '3.Sınıf' || arr[i] === '2.Sınıf' || arr[i] === '1.Sınıf') {
                                                    sectionObject.classRestriction.push(parseInt(arr[i].substring(0, 1)))
                                                } else {
                                                    throw Error('Inconsistent class restriction string part: \'' + arr[i] + '\'')
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

                        callback(null, result);
                    }
                }
            });
        }
    }
}())

