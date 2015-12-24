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

//    User.js
//
//    @description: User model

(function () {
    'use strict'

    var mongoose = require('mongoose')
    var Schema = mongoose.Schema

    var userSchema = new Schema({
        account: {
            username: String,
            password: String,
            PIN: String,
            email: String,
        },
        activation: {
            code: String,
            done: Boolean,
        },
        personal: {
            name: String,
            surname: String,
            studentID: Number,
            citizenID: Number,
            level: String,
            birthPlace: String,
            birthDate: String,
            registrationDate: String,
            fatherName: String,
            registrationMethod: String,
            email: String
        },
        academic: {
            marks: [{
                identifier: String,
                title: String,
                value: String,
                passed: Boolean
            }],
            current: [String],
        },
    })

    userSchema.methods.fullName = function() {
        return this.personal.name + " " + this.personal.surname
    }

    module.exports = mongoose.model('User', userSchema)
}())












