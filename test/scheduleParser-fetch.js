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

//    [TRAVIS CI] - Schedule parser module, -fetch() unit tests.

//  Unit test case: -fetch()
function fetch(assert, done, string) {
    var Parser = require('../scheduleParser')

    Parser.fetch(string, function (err, code) {
        assert.equal(err, null, 'Error thrown by fetching')

        code.forEach(function (element) {
            assert.strictEqual(code[0].code, element.code, 'Same result block should have same code')
        })

        //  Internal object consistency checks
        code.forEach(function (sectionObject, innerIndex) {
            //  CRN
            assert.strictEqual(typeof sectionObject.crn, 'number', 'CRN should be number')
            assert.equal(sectionObject.crn < 100000 && sectionObject.crn > 9999, true, 'CRN should be 5 decimals long')

            //  Code
            assert.strictEqual(typeof sectionObject.code, 'string', 'Code should be string')
            assert.equal(sectionObject.code.length, 3, 'Code should be 3 chars long')
            assert.strictEqual(sectionObject.code.toUpperCase(), sectionObject.code, 'Code should be uppercase')

            //  Number
            assert.strictEqual(typeof sectionObject.number, 'string', 'Number should be string')
            assert.notStrictEqual(parseInt(sectionObject.number), undefined, 'Number should be parseable to a decimal')
            assert.strictEqual(sectionObject.number.length, 3, 'Number should be 3 decimals long')

            //  Englishness
            assert.strictEqual(typeof sectionObject.isEnglish, 'boolean', 'Englishness should be Boolean')

            //  Title
            assert.strictEqual(typeof sectionObject.title, 'string', 'Title should be string')
            assert.equal(sectionObject.title.length > 1, true, 'Title should be 2 characters long at least')

            //  Instructor
            assert.strictEqual(typeof sectionObject.instructor, 'string', 'Instructor should be string')

            //  Building codes
            assert.equal(sectionObject.buildingCodes.constructor === Array, true, 'Building codes should be an array')
            sectionObject.buildingCodes.forEach(function (element) {
                assert.strictEqual(typeof element, 'string', 'Each building should be string')
                assert.equal(element.length < 8 && element.length > 2, true, 'Building identifier should have a length between 3 and 7')
                assert.equal(element === '---' || element.toUpperCase() === element, true, 'Building identifier should be either \'---\' or upper case: ' + element)
                assert.equal(element.indexOf(' '), -1, 'Building identifier should not consist whitespace')
                //  TODO: Building identifier should be an element of exhaustive list of building codes
            })

            //  Weekdays
            assert.equal(sectionObject.weekdays.constructor === Array, true, 'Weekdays should be an array')
            sectionObject.weekdays.forEach(function (element) {
                assert.strictEqual(typeof element, 'string', 'Each weekday should be string')
                //  TODO: Weekday should be an element of exhaustive list of building codes
            })

            //  Times
            //  TODO: Make necessary changes after doing time parsing.
            assert.strictEqual(typeof sectionObject.times, 'string', 'Times must be string')

            //  Room
            assert.equal(sectionObject.rooms.constructor === Array, true, 'Rooms must be an array')

            //  Caps
            assert.strictEqual(typeof sectionObject.capacity, 'number', 'Capacity must be a number')
            assert.equal(sectionObject.capacity >= 0, true, 'Capacity must be either a positive number or zero')

            //  Enrolled
            assert.strictEqual(typeof sectionObject.enrolled, 'number', 'Enrolled must be a number')
            assert.equal(sectionObject.enrolled >= 0, true, 'Enrolled must be either a positive number or zero')

            //  Reservation
            assert.equal(sectionObject.reservation === undefined || typeof sectionObject.reservation === 'string', true, 'Reservation must be either undefined or string')

            //  Major rest.
            assert.equal(sectionObject.majorRestriction === undefined || sectionObject.majorRestriction.constructor === Array, true, 'Major rest. must be either undefined or array')
            if (sectionObject.majorRestriction) {
                sectionObject.majorRestriction.forEach(function (element) {
                    assert.strictEqual(typeof element, 'string', 'Each element in major restriction should be string')
                })
            }

            //  Prerequisites
            assert.equal(sectionObject.prerequisites === undefined || typeof sectionObject.prerequisites === 'string', true, 'Prerequisites must be either undefined or string')

            //  Class rest.
            assert.equal(sectionObject.classRestriction === undefined || sectionObject.classRestriction.constructor === Array, true, 'Class restriction should be a number array')
            if (sectionObject.classRestriction) {
                sectionObject.classRestriction.forEach(function (element) {
                    assert.strictEqual(typeof element, 'number', 'Each element in class restriction should be a number')
                })
            }
        })

        done()
    })
}

require('../static/CourseCodes').forEach(function (element) {
    exports['test schedule fetcher: ' + element] = function (assert, done) {
        fetch(assert, done, element)
    }
})

if (module == require.main) require('test').run(exports)









