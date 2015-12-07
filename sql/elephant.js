//  elephant.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//    @description: Postgres database manager using Sequelize.js

(function () {
    'use strict'

    //  Encapsulation

    module.exports.pool = function() {
        const a = pool;

        return a;
    }

    module.exports.build = function() {
        return build();
    }
    
    module.exports.destroy = function() {
        return pool.drop().then(function () { console.log(new Date() + ': Database dropped.') });
    }
    
    //  Models
    module.exports.Place = function() {
        return Place;
    }
    module.exports.Building = function() {
        return Building;
    }
    module.exports.Lesson = function() {
        return Lesson;
    }
    module.exports.Section = function() {
        return Section;
    }
    module.exports.Course = function() {
        return Course;
    }
    module.exports.Schedule = function() {
        return Schedule;
    }

    //  kriskowal/Q's Promises/A+ implementation
    var Q = require('q');
    
    //  Postgres manager, Sequelize.js
    var Sequelize = require('sequelize');

    
    var pool = null;
    var Place, Building, Lesson, Section, Course, Schedule, Student;

    function build() {
        //  Resolve Sequelize.js pool
        pool = new Sequelize('postgres://Instigater@localhost:5432/Instigater', { logging: false });

        //  Web content
        
        Place = pool.define('place', {
            room: {
                type: Sequelize.STRING,
            }
        }, {
            freezeTableName: true
        });
        
        Building = pool.define('building', {
            shortName: {
                type: Sequelize.STRING,
            },
            longName: {
                type: Sequelize.STRING,
            },
            campus: {
                type: Sequelize.STRING,    //    will be changed to enum
            },
            image: {
                type: Sequelize.INTEGER,
            },
        }, {
            freezeTableName: true // Model tableName will be the same as the model name
        });

        Lesson = pool.define('lesson', {
            weekday: {
                type: Sequelize.ARRAY(Sequelize.INTEGER),    //    will be changed to enum
            },
            startTime: {
                type: Sequelize.INTEGER,
            },
            endTime: {
                type: Sequelize.INTEGER,
            },
        }, {
            freezeTableName: true // Model tableName will be the same as the model name
        });

        Section = pool.define('section', {
            //    CRN is the identifier of a section
            crn: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false,
            },
            //    Instructor of the section
            instructor: {
                type: Sequelize.STRING,
            },
            capacity: {
                type: Sequelize.INTEGER,
            },
            enrolled: {
                type: Sequelize.INTEGER,
            },
            reservation: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            majorRestriction: {
                type: Sequelize.ARRAY(Sequelize.STRING),
            },
        }, {
            freezeTableName: true // Model tableName will be the same as the model name
        });

        Course = pool.define('course', {
            code: {
                type: Sequelize.STRING,
            },
            number: {
                type: Sequelize.INTEGER,
            },
            isEnglish: {
                type: Sequelize.BOOLEAN,
            },
            title: {
                type: Sequelize.STRING,
            },
            prerequisites: {
                type: Sequelize.ARRAY(Sequelize.STRING),
            },
            classRestriction: {
                type: Sequelize.ARRAY(Sequelize.INTEGER),
                allowNull: true
            },
        }, {
            instanceMethods: {
                textualRepresentation: function() { return this.code + ' ' + this.number + (this.isEnglish ? 'E' : '') }
            },
            freezeTableName: true // Model tableName will be the same as the model name
        });

        Schedule = pool.define('schedule', {
            name: {
                type: Sequelize.STRING,
            },
            validUntil: {
                type: Sequelize.DATE
            },
        }, {
            freezeTableName:true
        });
        
        //  Accounts
        
        Student = pool.define('student', {
            username: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            PIN: {
                type: Sequelize.INTEGER,
                validate: {
                    len: [6, 6],
                }
            },
            name: {
                type: Sequelize.STRING,
            },
            imageURL: {
                type: Sequelize.STRING,
                allowNull: true,
                validate: {
                    isURL: true,
                }
            },
            ID: {
                type: Sequelize.STRING,
            },
            turkishRepublicID: {
                type: Sequelize.STRING,
            },
            surname: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            level: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            birthPlace: {
                type: Sequelize.STRING,
            },
            birthDate: {
                type: Sequelize.STRING,
            },
            registrationDate: {
                type: Sequelize.STRING,
            },
            phoneNumber: {
                type: Sequelize.STRING,
            },
            balance: {
                type: Sequelize.FLOAT,
            }
        });

        Place.hasOne(Building);
        Lesson.hasOne(Place);
        Section.hasMany(Lesson);
        Lesson.belongsTo(Section);
        Course.hasMany(Section);
        Section.belongsTo(Course);
        Schedule.hasMany(Course);
        Course.belongsTo(Schedule);
        
        return pool.sync();
    }
}());

//AttributeDefinitions: [
//    { AttributeName: 'crn', AttributeType: 'N' },
//    { AttributeName: 'code', AttributeType: 'S' },
//    { AttributeName: 'number', AttributeType: 'N' },
//    { AttributeName: 'isEnglish', AttributeType: 'BOOL' },
//    { AttributeName: 'title', AttributeType: 'S' },
//    { AttributeName: 'instructor', AttributeType: 'S' },
//    { AttributeName: 'buildingCodes', AttributeType: 'SS' },
//    { AttributeName: 'weekdays', AttributeType: 'NS' },
//    { AttributeName: 'times', AttributeType: 'S' },
//    { AttributeName: 'rooms', AttributeType: 'SS' },
//    { AttributeName: 'capacity', AttributeType: 'N' },
//    { AttributeName: 'enrolled', AttributeType: 'N' },
//    { AttributeName: 'reservation', AttributeType: 'S' },
//    { AttributeName: 'majorRestriction', AttributeType: 'SS' },
//    { AttributeName: 'prerequisites', AttributeType: 'S' },
//    { AttributeName: 'classRestriction', AttributeType: 'N' },
//],
//    
//    'PutRequest': {
//        'Item': {
//            'Name': {
//                'S': 'Amazon DynamoDB'
//            },
//            'Category': {
//                'S': 'Amazon Web Services'
//            }
//        }
//    }
















