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

//    portalParser.js
//
//    @description: ITU/Ninova portal parser

(function() {
    'use strict'

    var request = require('request')
    var DomParser = require('dom-parser')
    var async = require('async')

    var exampleAcc = require('./exampleAcc.json')
    var headers = require('./portalParserHeaders.json')

    var debug = true

    getAccountInformation(exampleAcc, function (err, transcript, image) {
        if (!err && transcript && image) {
            console.log('Successfully got account info.')
        }
    })

    function getAccountInformation(account, finalCallback) {
        var responses = []

        var cookieJar = request.jar()

        var transcript = null
        var image = null

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
                console.log(response.statusCode)
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
                        UsernameTbx: account.username,
                        PasswordTbx: account.password,
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
                console.log(response.statusCode)
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

                account.sid = body.substr(body.search('<OPTION VALUE="') + '<OPTION VALUE="'.length, 9)

                if (parseInt(account.sid)) {
                    var options = {
                        method: 'POST',
                        url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_ValLogin',
                        headers: headers[8],
                        followRedirect: false,
                        jar: cookieJar,
                        form: {
                            sid: account.sid,
                            PIN: account.PIN,
                            SessionId: responses[6].headers.location.substring(responses[6].headers.location.search('SessionId=') + 10, responses[6].headers.location.length + 1),
                        }
                    }

                    request(options, callback)
                } else {
                    finalCallback(Error('Account \'sid\' could not be resolved.'))
                }
            }, function (response, body, callback) {

                if (response.statusCode != 200) finalCallback(Error('Invalid username, password and PIN.'))

                transcript = body

                var options = {
                    method: 'GET',
                    url: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response',
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {

                if (response.statusCode != 200) finalCallback(Error('Could not reach student image'))

                image = body

                var options = {
                    method: 'GET',
                    url: 'http://resimler.sis.itu.edu.tr/' + account.sid.substr(0, 3) + '/' + account.sid.substr(3, 2) + '/' + account.sid.substr(5, 4) + '.jpg',
                    headers: {
                        Referer: 'http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response',
                    },
                    followRedirect: false,
                    jar: cookieJar,
                }

                request(options, callback)
            }, function (response, body, callback) {

                if (response.statusCode != 200) finalCallback(Error('Could not reach student image'))

                finalCallback(null, transcript, image)
            }
        ])
    }
}());
