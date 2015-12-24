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

//    Section.js
//
//    @description: Section model, defines each CRN in sections

(function () {
    'use strict'

    var mongoose = require('mongoose')
    var Schema = mongoose.Schema

    var courseCodes = require('../static-content/courseCodes.json')

    var sectionSchema = new Schema({
        crn: String,
        code: String,
        number: String,
        isEnglish: Boolean,
        title: String,
        instructor: String,
        buildingCodes: [String],
        weekdays: [String],
        times: String,
        rooms: [String],
        capacity: Number,
        enrolled: Number,
        reservation: String,
        majorRestriction: [String],
        prerequisites: String,
        classRestriction: [Number],
    })

    sectionSchema.statics.isValidCode = function (string) {
        return courseCodes.indexOf(string) != -1
    }

    sectionSchema.statics.parseIdentifier = function (string) {
        var courseObject = {}

        courseObject.code = text.substring(0, 3)
        courseObject.number = parseInt(text.substring(4, 7))
        courseObject.isEnglish = text.charAt(7) == 'E'

        return courseObject
    }

    sectionSchema.methods.identifier = function () {
        return this.code + " " + this.number + (this.isEnglish ? "E":"")
    }

    sectionSchema.methods.availableSlots = function () {
        return (this.capacity - this.enrolled > 0) ? (this.capacity - this.enrolled):0
    }

    module.exports = mongoose.model('Section', sectionSchema)
}())












