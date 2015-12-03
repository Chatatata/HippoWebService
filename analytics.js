//  analytics.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//    @description: Postgres database manager using Sequelize.js

(function () {
    "use strict"
    
    var stats = [];
    
    module.exports.stats = function () {
        return stats;
    }
    
    var tokens = [];
    
    class Token {
        constructor(registerer) {
            this.registerer = registerer;
            this.date = new Date();
        }
        
        push(context, data) {
            stats.push({
                token: this,
                date: new Date(),
                context: context,
                data: data,
            });
        }
        
        get(context) {
            var result = [];
        
            stats.forEach(function (element, index, array) {
                if ((element.token.registerer === candidate) && (element.context === context || context === null))  {
                    result.push(element.data);
                }
            });

            return result;
        }
    }
    
    module.exports.register = function(candidate) {        
        var token = new Token(candidate);
        
        tokens.push(token);
        
        return token;
    }
})();