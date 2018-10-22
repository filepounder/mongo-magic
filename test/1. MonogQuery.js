const assert = require('assert');
const mongo = require('mongodb');
const async = require('async');
const MongoQuery = require('../lib').MongoQuery;

var dbConfig = {
    "connectionString": "mongodb://127.0.0.1/mongoutilstests",
    "connectionOptions": {
        "server": {
            "socketOptions": {
                "keepAlive": 1
            },
            "auto_reconnect": true
        }
    }
}

var _db = null;

describe('Mongo Query', function () {
    before(function (done) {


        function dbConnected(err, database) {
            if (err) return done(err);
            _db = database;
            // runs before all tests in this block
            _db.collections(function (err, collections) {
                if (err) return done(err);
                async.each(collections,
                    function (item, itemCallback) {
                        item.deleteMany({}, itemCallback);
                    },
                    function (err) {
                        return done(err);
                    }
                );
            });
        }

        mongo.MongoClient.connect(
            dbConfig.connectionString,
            dbConfig.connectionOptions,
            dbConnected
        );
    });


    it('should throw an error when no config specified', function () {
        assert.throws(function () {
            let mongoQuery = new MongoQuery();

        }, Error, "No error thrown")
    });

    it('should parse a simple query string', function () {
        let mongoQuery = new MongoQuery("$sort=-field1,field2&$select=field1,field2");

        assert.deepEqual(mongoQuery.parsedQuery.select, {field1: true, field2: true}, "Invalid Select")
        assert.deepEqual(mongoQuery.parsedQuery.sort, {field1: -1, field2: 1}, "Invalid Sort")
    });

    it('should parse a complex select with inclusions', function () {
        let mongoQuery = new MongoQuery("$select=field1,field2");

        assert.deepEqual(mongoQuery.parsedQuery.select, {field1: true, field2: true}, "Invalid Select")
    });

    it('should parse a complex select with exclusions', function () {
        let mongoQuery = new MongoQuery("$select=-field1,-field2");

        assert.deepEqual(mongoQuery.parsedQuery.select, {field1: false, field2: false}, "Invalid Select")
    });

    it('should throw an error on a select with exclusions and inclusions', function () {
        assert.throws(function () {
            let mongoQuery = new MongoQuery("$select=field1,-field2");

        }, Error, "No error thrown")
    });

    it('should throw an error on a select with exclusions and inclusions 2', function () {
        assert.throws(function () {
            let mongoQuery = new MongoQuery("$select=-field1,field2");

        }, Error, "No error thrown")
    });


    it('should parse a complex filter', function () {
        let mongoQuery = new MongoQuery("$filter=field1/field2 eq 'a'");

        assert.deepEqual(mongoQuery.parsedQuery.query, {"field1.field2": "a"}, "Invalid Select")
    });

    it('should parse a raw query', function () {
        let mongoQuery = new MongoQuery('$rawQuery={"field1.field2":{"$date":"2016-01-01T00:00:00Z"}}');

        assert.deepEqual(mongoQuery.parsedQuery.query, {"field1.field2": new Date("2016-01-01T00:00:00Z")}, "Invalid Raw Query")
    });

    it('should parse a raw query and filter', function () {
        let mongoQuery = new MongoQuery('$filter=field2 eq \'a\'&$rawQuery={"field1":{"$date":"2016-01-01T00:00:00Z"}}');

        assert.deepEqual(mongoQuery.parsedQuery.query, {
            field2: "a",
            "field1": new Date("2016-01-01T00:00:00Z")
        }, "Invalid  Query")
    });

    it('should parse a raw query and filter with a default', function () {
        let mongoQuery = new MongoQuery('$filter=field2 eq \'a\'&$rawQuery={"field1":{"$date":"2016-01-01T00:00:00Z"}}', {field3: 3});

        assert.deepEqual(mongoQuery.parsedQuery.query, {
            field2: "a",
            "field1": new Date("2016-01-01T00:00:00Z"),
            field3: 3
        }, "Invalid  Query")
    });
});
