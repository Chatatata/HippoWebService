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

//    [TRAVIS CI] - Portal parser module, -fetch() unit tests.


exports['test async account: exampleAcc.json'] = function (assert, done) {
    var fs              = require('fs')
    var validator       = require('validator')

    var Parser          = require('../PortalParser')

    var exacc = require('../sensitive-information/exampleAcc.json')

    Parser.fetch(exacc, function (err, rawData) {
        assert.equal(err, null, 'No implementation error thrown at function')

        //  Raw data validation
        assert.strictEqual(typeof rawData.transcript, 'string', 'Transcript should be a string')
        assert.strictEqual(typeof rawData.image, 'string', 'Image should be binary data')
        assert.strictEqual(typeof rawData.schedule, 'string', 'Schedule should be a string')

        Parser.parse(rawData, function (err, student) {
            //  Personal Information
            assert.strictEqual(typeof student.personalInformation, 'object', 'Student should have personal information object')
            assert.strictEqual(typeof student.personalInformation.name, 'string', 'Student name should be a string')
            assert.strictEqual(typeof student.personalInformation.surname, 'string', 'Student surname should be a string')
            assert.strictEqual(typeof student.personalInformation.studentID, 'string', 'Student ID should be a string')
            assert.equal(isNumeric(student.personalInformation.studentID), true, 'Student ID should be a number string')
            assert.strictEqual(typeof student.personalInformation.ID, 'string', 'Student legal ID should be a string')
            assert.equal(isNumeric(student.personalInformation.ID), true, 'Student legal ID should be a number string')
            assert.strictEqual(typeof student.personalInformation.level, 'string', 'Student level should be a string')
            assert.strictEqual(typeof student.personalInformation.birthPlace, 'string', 'Student birth place should be a string')
            assert.strictEqual(typeof student.personalInformation.birthDate, 'string', 'Student birth date should be a string')
            assert.strictEqual(typeof student.personalInformation.registrationDate, 'string', 'Student registration date should be a string')

            //  Grades
            assert.strictEqual(student.grades.constructor, Array, 'Grades should be array')

            student.grades.forEach(function (element) {
                assert.strictEqual(element.cosntructor, Grade, 'Each grade should be a Grade class instance')
                assert.strictEqual(typeof element.identifier, 'string', 'Grade identifier should be a string')
                assert.strictEqual(element.identifier.substr(0, 3), element.identifier.substr(0, 3).toUpperCase, 'First three letters of identifier should be upper case')
                assert.equal(isNumeric(element.identifier.substr(4, 3)), true, 'Identifier should have a number')
            })

//            console.log('../sensitive-information/ab-tests/' + student.account.username + '.json')
//
//            fs.writeFileSync('../sensitive-information/ab-tests/' + student.account.username + '.json', JSON.stringify(student, null, 4), { flag: 'w+', encoding: 'utf8' })

            done()
        })
    })
}

if (module == require.main) require('test').run(exports)
