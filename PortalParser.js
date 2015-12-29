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
//                  anno - Announcement
//

(function() {
    'use strict'

    var fs                      = require('fs')
    var request                 = require('request')
    var DomParser               = require('dom-parser')
    var async                   = require('async')
    var htmlparser              = require('htmlparser2')
    var cheerio                 = require('cheerio')
    var Iconv                   = require('iconv').Iconv

    var User                    = require('./models/User')
     ,  Section                 = require('./models/Section')
     ,  Announcement            = require('./models/Announcement')
     ,  Assignment              = require('./models/Assignment')

    var headers = require('./static-content/PortalParserHeaders.json')

    function fetchSIS(user, callback) {
        var responses = []

        user.jars.sisJar = request.jar()

        var userRawData = {}

        async.waterfall([
            function (callback) {
                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_WWWLogin',
                    headers: headers.sis[0],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers.sis[1],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: 'https://giris.itu.edu.tr' + response.headers.location,
                    headers: headers.sis[2],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))

                //  Get current .NET viewstate
                var parser = new DomParser()

                var dom = parser.parseFromString(body)

                var options = {
                    method: 'POST',
                    url: 'https://giris.itu.edu.tr' + responses[1].headers.location,
                    headers: headers.sis[3],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                    form: {
                        __EVENTTARGET: '',
                        __EVENTARGUMENT: '',
                        __VIEWSTATE: dom.getElementById('__VIEWSTATE').attributes[3].value,
                        __VIEWSTATEGENERATOR: 'C2EE9ABB',
                        UsernameTbx: user.account.username,
                        PasswordTbx: user.account.password,
                        'LoginBtn.x': '79',
                        'LoginBtn.y': '14',
                    },
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: 'https://giris.itu.edu.tr' + response.headers.location,
                    headers: headers.sis[4],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                //  TODO: There should be a check regarding temporary popups.
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: 'https://giris.itu.edu.tr' + response.headers.location,
                    headers: headers.sis[5],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers.sis[6],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers.sis[7],
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))

                user.personal.studentID = body.substr(body.search('<OPTION VALUE="') + '<OPTION VALUE="'.length, 9)

                if (parseInt(user.personal.studentID)) {
                    var options = {
                        method: 'POST',
                        url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_ValLogin',
                        headers: headers.sis[8],
                        followRedirect: false,
                        jar: user.jars.sisJar,
                        form: {
                            sid: user.personal.studentID + '',
                            PIN: user.account.PIN,
                            SessionId: responses[6].headers.location.substring(responses[6].headers.location.search('SessionId=') + 10, responses[6].headers.location.length + 1),
                        }
                    }

                    request(options, callback)
                } else {
                    callback(Error('Student ID could not be resolved.'))
                }
            }, function (response, body, callback) {

                if (response.statusCode != 200) return callback(Error('Invalid username, password and PIN.'))

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response',
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) return callback(Error('Could not reach student image'))

                userRawData.transcript = body

                var sid = user.personal.studentID + ''

                var options = {
                    method: 'GET',
                    url: 'http://resimler.sis.itu.edu.tr/' + sid.substr(0, 3) + '/' + sid.substr(3, 2) + '/' + sid.substr(5, 4) + '.jpg',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response',
                    },
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) return callback(Error('Could not reach student image'))

                userRawData.image = body

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/bwskfshd.P_CrseSchd',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_GenMenu?name=bmenu.P_RegMnu',
                    },
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) return callback(Error('Could not reach student schedule'))

                userRawData.schedule = body

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/bwgkogad.P_SelectEmalView',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_GenMenu?name=bmenu.P_RegMnu',
                    },
                    followRedirect: false,
                    jar: user.jars.sisJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                if (response.statusCode != 200) return callback(Error('Could not reach student email'))

                userRawData.email = body

                callback(null, userRawData)
            }
        ], callback)
    }

    function parseSIS(user, userRawData, callback) {
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
                                                        user.academic.marks.push(grade)
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
                                                    user.academic.current.push(text)
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
            email: function (callback) {
                userRawData.email = userRawData.email.substring(userRawData.email.indexOf('<TD COLSPAN="2" CLASS="dddefault">') + '<TD COLSPAN="2" CLASS="dddefault">'.length, userRawData.email.length)
                user.personal.email = userRawData.email.substring(0, userRawData.email.indexOf('\n</TD>'))
                user.account.email = user.personal.email

                callback(null)
            }
        }, callback)
    }

    function fetchNinova(user, callback) {
        var responses = []

        user.jars.ninovaJar = request.jar()

        var userRawData = {}

        async.waterfall([
            function (callback) {
                var options = {
                    method: 'GET',
                    url: 'http://ninova.itu.edu.tr/Login.aspx?ReturnUrl=/kampus',
                    headers: headers.ninova[0],
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers.ninova[1],
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))

                headers.sis[2].Referer = responses[0].headers.location

                var viewState = body.substring(body.indexOf('name="__VIEWSTATE" id="__VIEWSTATE" value="') + 'name="__VIEWSTATE" id="__VIEWSTATE" value="'.length, body.length)
                viewState = viewState.substring(0, viewState.indexOf('" />'))

                var eventValidation = body.substring(body.indexOf('name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="') + 'name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="'.length, body.length)
                eventValidation = eventValidation.substring(0, eventValidation.indexOf('" />'))

                var options = {
                    method: 'POST',
                    url: responses[0].headers.location,
                    headers: headers.ninova[2],
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                    form: {
                        "__VIEWSTATE": viewState,
                        "__VIEWSTATEGENERATOR": "C2EE9ABB",
                        "__EVENTVALIDATION": eventValidation,
                        "ctl00$ContentPlaceHolder1$tbUserName": user.account.username,
                        "ctl00$ContentPlaceHolder1$tbPassword":	user.account.password,
                        "ctl00$ContentPlaceHolder1$btnLogin": "Giriş",
                    }
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: response.headers.location,
                    headers: headers.ninova[3],
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 302) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: "http://ninova.itu.edu.tr/Kampus1",
                    headers: headers.ninova[4],
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))

                var options = {
                    method: 'GET',
                    url: "http://ninova.itu.edu.tr/members/ogrenci.duyurular.aspx?1/Duyurular",
                    headers: headers.ninova[4],
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))

                userRawData.announcements = body

                var subHeader = headers.ninova[4]
                subHeader.Referer = "http://ninova.itu.edu.tr/members/ogrenci.duyurular.aspx?1/Duyurular"

                var options = {
                    method: 'GET',
                    url: "http://ninova.itu.edu.tr/Kampus?1/Odevler",
                    headers: subHeader,
                    followRedirect: false,
                    jar: user.jars.ninovaJar,
                }

                request(options, callback)
            }, function (response, body, callback) {
                responses.push(response)

                if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))

                userRawData.assignments = body

                callback(null, userRawData)
            }
        ], callback)
    }

    function getAnnouncement(user, smallAnno, callback) {
        var subHeader = headers.ninova[4]
        subHeader.Referer = "http://ninova.itu.edu.tr/Kampus?1/Duyurular"

        var options = {
            method: 'GET',
            url: "http://ninova.itu.edu.tr" + smallAnno.href,
            headers: subHeader,
            followRedirect: false,
            jar: user.jars.ninovaJar,
        }

        request(options, function (err, response, body) {
            if (err) callback(err)
            else if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))
            else {
                var $ = cheerio.load(body, { normalizeWhitespace: true })

                smallAnno.body = $('.duyuruGoruntule div.icerik').text().trim()
                callback(null, smallAnno)
            }
        })
    }

    function getAssignment(user, smallAss, callback) {
        var subHeader = headers.ninova[4]
        subHeader.Referer = "http://ninova.itu.edu.tr/Kampus?1/Duyurular"

        var options = {
            method: 'GET',
            url: "http://ninova.itu.edu.tr" + smallAss.href,
            headers: subHeader,
            followRedirect: false,
            jar: user.jars.ninovaJar,
        }

        request(options, function (err, response, body) {
            if (err) callback(err)
            else if (response.statusCode != 200) return callback(Error('Could not reproduce connection sequence.'))
            else {
                var $ = cheerio.load(body, { normalizeWhitespace: true })

                smallAss.body = $('span.data_field').text().trim()

                callback(null, smallAss)
            }
        })
    }

    function parseNinova(user, userRawData, callback) {
        async.parallel({
            announcements: function (callback) {
                var $ = cheerio.load(userRawData.announcements, { normalizeWhitespace: true })

                var smallAnnos = []

                $('.duyuruGoruntule').each(function () {
                    var href = $(this).find('a').attr('href')

                    var announcement = new Announcement({
                        href: href,
                        _ndid: parseInt(href.substring(href.lastIndexOf('/') + 1)),
                        title: $(this).find('a').first().text(),
                        course: Section.parseIdentifier($(this).find('strong').text().substring(0, 8)),
                        date: $(this).find('span.tarih').first().text(),
                        author: $(this).find('div.tarih').text().trim()
                    })

                    smallAnnos.push(announcement)
                })

                async.map(smallAnnos, function (smallAnno, callback) { getAnnouncement(user, smallAnno, callback) }, function (err, results) {
                    console.log('announcements: ' + results)
                    if (err) callback(err)
                    else {
                        user.portal.announcements = results

                        callback(null)
                    }
                })
            },
            assignments: function (callback) {
                var $ = cheerio.load(userRawData.assignments, { normalizeWhitespace: true })

                var smallAsss = []

                $('#ctl00_ContentPlaceHolder1_gvOdevListesi td').each(function (index, element) {
                    var href = $(this).find('a').attr('href')

                    if (href) {
                        var assignment = new Assignment({
                            href: href,
                            _ndid: parseInt(href.substring(href.lastIndexOf('/') + 1)),
                            title: $(this).find('a').first().text(),
                            course: Section.parseIdentifier($(this).contents().eq(4).text().substr(0, 8)),
                            posted: $(this).contents().eq(12).text(),
                            due: $(this).contents().eq(16).text()
                        })

                        smallAsss.push(assignment)
                    } else {
                        //  Break the loop

                        return false
                    }
                })

                async.map(smallAsss, function (smallAss, callback) { getAssignment(user, smallAss, callback) }, function (err, results) {
                    console.log('assignments: ' + results)
                    if (err) callback(err)
                    else {
                        user.portal.assignments = results

                        callback(null)
                    }
                })
            }
        }, callback)
    }

    module.exports.fetchUser = function (credentials, callback) {
        var user = User.raiseFromCredentials(credentials)

        async.parallel([
            function (callback) {
                fetchSIS(user, function (err, userRawData) {
                    parseSIS(user, userRawData, callback)
                })
            },
            function (callback) {
                fetchNinova(user, function (err, userRawData) {
                    parseNinova(user, userRawData, callback)
                })
            }
        ], function (err) {
            if (err) callback(err)
            else callback(null, user)
        })
    }

    console.log(new Date())
    module.exports.fetchUser(require('./sensitive-information/exampleAcc.json'), function (err, results) {
        if (err) console.error(err)
        else {
            console.log(results)
            console.log(new Date())
        }
    })
}())













