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

//    PortalParser.js
//
//    @description: ITU/Ninova portal parser

(function() {
    'use strict'

    var fs                      = require('fs')
    var request                 = require('request')
    var DomParser               = require('dom-parser')
    var async                   = require('async')
    var htmlparser              = require('htmlparser2')

    var User                    = require('./models/User')

    var headers = require('./static-content/PortalParserHeaders.json')

    function fetch(credentials, finalCallback) {
        var responses = []

        var cookieJar = request.jar()

        var userRawData = { credentials: credentials }

        async.waterfall([
            function (callback) {
                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_WWWLogin',
                    headers: headers[0],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) finalCallback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers[1],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) finalCallback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: 'https://giris.itu.edu.tr' + response.headers.location,
                    headers: headers[2],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) finalCallback(Error('Could not reproduce connection sequence.'))

                //  Get current .NET viewstate
                var parser = new DomParser()

                var dom = parser.parseFromString(body)

                var options = {
                    method: 'POST',
                    url: 'https://giris.itu.edu.tr' + responses[1].headers.location,
                    headers: headers[3],
                    followRedirect: false,
                    jar: cookieJar,
                    form: {
                        __EVENTTARGET: '',
                        __EVENTARGUMENT: '',
                        __VIEWSTATE: dom.getElementById('__VIEWSTATE').attributes[3].value,
                        __VIEWSTATEGENERATOR: 'C2EE9ABB',
                        UsernameTbx: credentials.username,
                        PasswordTbx: credentials.password,
                        'LoginBtn.x': '79',
                        'LoginBtn.y': '14',
                    },
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) finalCallback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: 'https://giris.itu.edu.tr' + response.headers.location,
                    headers: headers[4],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                //  TODO: There should be a check regarding temporary popups.
                responses.push(response)

                if (response.statusCode != 302) finalCallback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: 'https://giris.itu.edu.tr' + response.headers.location,
                    headers: headers[5],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) finalCallback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers[6],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) finalCallback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers[7],
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) finalCallback(Error('Could not reproduce connection sequence.'))

                credentials.sid = body.substr(body.search('<OPTION VALUE="') + '<OPTION VALUE="'.length, 9)

                if (parseInt(credentials.sid)) {
                    var options = {
                        method: 'POST',
                        url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_ValLogin',
                        headers: headers[8],
                        followRedirect: false,
                        jar: cookieJar,
                        form: {
                            sid: credentials.sid,
                            PIN: credentials.PIN,
                            SessionId: responses[6].headers.location.substring(responses[6].headers.location.search('SessionId=') + 10, responses[6].headers.location.length + 1),
                        }
                    }

                    request(options, callback)
                } else {
                    finalCallback(Error('Student ID could not be resolved.'))
                }
            }, function (response, body, callback) {

                if (response.statusCode != 200) finalCallback(Error('Invalid username, password and PIN.'))

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response',
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) finalCallback(Error('Could not reach student image'))

                userRawData.transcript = body

                var options = {
                    method: 'GET',
                    url: 'http://resimler.sis.itu.edu.tr/' + credentials.sid.substr(0, 3) + '/' + credentials.sid.substr(3, 2) + '/' + credentials.sid.substr(5, 4) + '.jpg',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response',
                    },
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) finalCallback(Error('Could not reach student image'))

                userRawData.image = body

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/bwskfshd.P_CrseSchd',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_GenMenu?name=bmenu.P_RegMnu',
                    },
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) finalCallback(Error('Could not reach student schedule'))

                userRawData.schedule = body

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/bwgkogad.P_SelectEmalView',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_GenMenu?name=bmenu.P_RegMnu',
                    },
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) finalCallback(Error('Could not reach student email'))

                userRawData.email = body

                finalCallback(null, userRawData)
            }, 
        ])
    }

    function parse(userRawData, callback) {
        var user = new User()

        async.parallel({
            transcript: function (callback) {
                userRawData.transcript = userRawData.transcript.substring(userRawData.transcript.indexOf('<FONT FACE'), userRawData.transcript.length)
                userRawData.transcript = userRawData.transcript.substring(0, userRawData.transcript.indexOf('**End of Document**'))

                var index = 0
                var array = []

                var step = 0
                var state = -1
                var grade = {}

                var parser = new htmlparser.Parser({
                    ontext: function (text) {
                        if (text !== '\\n') {
                            while (text.indexOf('&nbsp;') != - 1) {
                                text = text.substring(text.indexOf('&nbsp;') + 6, text.length)
                            }

                            text = text.trim()

                            if (text.length !== 0) {
                                //  Here we have tailored inlines
                                array.push(text)

                                //  First, user information
                                if (step == 0) {
                                    switch (array[array.length - 2]) {
                                        case 'Student ID':
                                            user.personal.studentID = text
                                            break
                                        case 'Republic of Turkey ID No':
                                            user.personal.citizenID = text
                                            break
                                        case 'Surname':
                                            user.personal.surname = text
                                            break
                                        case 'Level':
                                            user.personal.level = text
                                            break
                                        case 'Name':
                                            user.personal.name = text
                                            break
                                        case 'Birth Place':
                                            user.personal.birthPlace = text
                                            break
                                        case 'Birth Date':
                                            user.personal.birthDate = text
                                            break
                                        case 'Reg. Date':
                                            user.personal.registrationDate = text
                                            break
                                        case 'Father Name':
                                            user.personal.fatherName = text
                                            break
                                        case 'Reg. Type':
                                            user.personal.registrationMethod = text
                                            step = 1
                                            break
                                        default:
                                            //  do nothing
                                            break
                                    }
                                } else if (step == 1) {
                                    if (text === 'Grd.') {
                                        //  Get ready to parse grades
                                        state = 0
                                    } else if (text === 'A.Crd.') {
                                        //  Halt state machine
                                        state = -1
                                    } else if (text === 'Lectures in Progress') {
                                        //  Jump state machine
                                        step = 2
                                        state = -1
                                    } else {
                                        if (state != -1) {
                                            switch (state) {
                                                case 0:
                                                    grade.identifier = text
                                                    state = 1
                                                    break
                                                case 1:
                                                    grade.title = text
                                                    state = 2
                                                    break
                                                case 2:
                                                    if (text.split('')[text.length - 1] !== '*') {
                                                        grade.value = text
                                                        grade.passed = !(grade.value === 'VF' || grade.value === 'FF')
                                                        user.marks.push(grade)
                                                    }

                                                    grade = {}
                                                    state = 0
                                                    break
                                            }
                                        }
                                    }
                                } else if (step == 2) {
                                    if (text === 'Title') {
                                        //  Get ready to parse grades
                                        state = 0
                                    } else if (text === 'Lec. Code') {
                                        //  Halt state machine
                                        state = -1
                                    } else {
                                        if (state != -1) {
                                            switch (state) {
                                                case 0:
                                                    user.currentCourses.push(text)
                                                    state = 1
                                                    break
                                                case 1:
                                                    //  do nothing
                                                    state = 0
                                                    break
                                            }
                                        }
                                    }
                                } else {
                                    callback(Error('Invalid state machine step'))
                                }

                                ++index
                            }
                        }
                    },
                })

                parser.write(userRawData.transcript)
                parser.end()

                callback(null)
            },
            schedule: function (callback) {
                callback(null)
            },
            account: function (callback) {
                user.account.username = userRawData.credentials.username
                user.account.password = userRawData.credentials.password
                user.account.PIN = userRawData.credentials.PIN

                callback(null)
            },
            email: function (callback) {
                userRawData.email = userRawData.email.substring(userRawData.email.indexOf('<TD COLSPAN="2" CLASS="dddefault">') + '<TD COLSPAN="2" CLASS="dddefault">'.length, userRawData.email.length)
                user.personal.email = userRawData.email.substring(0, userRawData.email.indexOf('\n</TD>'))
                user.account.email = user.personal.email

                callback(null)
            }
        }, function (err) {
            callback (err, !err ? user:null)
        })
    }

    module.exports = function (credentials, callback) {
        fetch(credentials, function (err, rawData) {
            parse(rawData, callback)
        })
    }
}())













