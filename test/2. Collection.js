const assert = require('assert');
const mongo = require('mongodb');
const async = require('async');
const Collection = require('../lib').Collection;
const _s = require('underscore.string');
const moment = require('moment');
const $stream = require('stream');
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

describe('Collection', function () {
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
            let collection = new Collection();

        }, Error, "No error thrown")
    });

    describe('query', function () {
        before(function (done) {
            _db.collection("testquery").insertMany([
                {
                    val: "a"
                },
                {
                    val: "b"
                }
            ], function (err) {
                return done(err)
            });
        });

        it('should stream results', function (done) {
            let collection = new Collection(_db.collection("testquery"));
            let ws = new $stream.Writable({objectMode: true})
            let writeCnt = 0;
            ws._write = function (chunk, encoding, done) {
                writeCnt++;
                return done();
            }

            ws.on('finish', function () {
                assert.equal(writeCnt, 2, "Invalid writes")
                return done();
            })

            let mQuery = new MongoQuery({limit: 1000});
            collection.queryAsStream(mQuery).pipe(ws)


        });


    });

    describe('Stats', function () {
        before(function (done) {
            _db.collection("teststats").insertMany([
                {
                    val: "a"
                },
                {
                    val: "b"
                }
            ], function (err) {
                return done(err)
            });
        });

        it('should throw an error on invalid config 1', function () {
            assert.throws(function () {
                let collection = new Collection(_db.collection("teststats"));
                collection.updateStats({}, function () {
                })

            }, Error, "No error thrown")
        });

        it('should throw an error on invalid config 2', function () {
            assert.throws(function () {
                let collection = new Collection(_db.collection("teststats"));
                collection.updateStats({statsField: "123"}, function () {
                })

            }, Error, "No error thrown")
        });

        it('should update stats', function (done) {
            let date = new Date();
            let momentDate = new moment(date).utc();
            let year = momentDate.year();
            let month = _s.lpad(momentDate.month() + 1, 2, '0');
            let day = _s.lpad(momentDate.date(), 2, '0');
            let hour = _s.lpad(momentDate.hour(), 2, '0');

            let collection = new Collection(_db.collection("teststats"));
            collection.updateStats({
                statsField: "stats1",
                date: new Date(),
                query: {val: "a"},
                increments: {
                    field: "counter",
                    value: 1
                }
            }, function (err) {
                assert(!err, "Error Occurred");
                _db.collection("teststats").findOne({val: "a"}, function (err, result) {
                    assert(!err, "Error Occurred");
                    assert.equal(result.stats1.counter, 1, "Invalid stats value")
                    assert.equal(result.stats1[year].counter, 1, "Invalid stats value")
                    assert.equal(result.stats1[year][month].counter, 1, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day].counter, 1, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day][hour].counter, 1, "Invalid stats value")
                    return done();
                })
            })

        });

        it('should update stats at a different date', function (done) {
            let date = new Date();
            let momentDate = new moment(date).utc().subtract(1, 'month');
            let year = momentDate.year();
            let month = _s.lpad(momentDate.month() + 1, 2, '0');
            let day = _s.lpad(momentDate.date(), 2, '0');
            let hour = _s.lpad(momentDate.hour(), 2, '0');

            let collection = new Collection(_db.collection("teststats"));
            collection.updateStats({
                statsField: "stats1",
                date: momentDate.toDate(),
                query: {val: "a"},
                increments: {
                    field: "counter",
                    value: 10
                }
            }, function (err) {
                assert(!err, "Error Occurred");
                _db.collection("teststats").findOne({val: "a"}, function (err, result) {
                    assert(!err, "Error Occurred");
                    assert.equal(result.stats1.counter, 11, "Invalid stats value")
                    assert.equal(result.stats1[year].counter, 11, "Invalid stats value")
                    assert.equal(result.stats1[year][month].counter, 10, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day].counter, 10, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day][hour].counter, 10, "Invalid stats value")
                    return done();
                })
            })

        });


        it('should update mulyiple stats', function (done) {
            let date = new Date();
            let momentDate = new moment(date).utc();
            let year = momentDate.year();
            let month = _s.lpad(momentDate.month() + 1, 2, '0');
            let day = _s.lpad(momentDate.date(), 2, '0');
            let hour = _s.lpad(momentDate.hour(), 2, '0');

            let collection = new Collection(_db.collection("teststats"));
            collection.updateStats({
                statsField: "stats1",
                date: new Date(),
                query: {val: "b"},
                increments: [
                    {
                        field: "counter1",
                        value: -1
                    },
                    {
                        field: "counter2",
                        value: 1
                    }
                ]
            }, function (err) {
                assert(!err, "Error Occurred");
                _db.collection("teststats").findOne({val: "b"}, function (err, result) {
                    assert(!err, "Error Occurred");
                    assert.equal(result.stats1.counter1, -1, "Invalid stats value")
                    assert.equal(result.stats1[year].counter1, -1, "Invalid stats value")
                    assert.equal(result.stats1[year][month].counter1, -1, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day].counter1, -1, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day][hour].counter1, -1, "Invalid stats value")
                    assert.equal(result.stats1.counter2, 1, "Invalid stats value")
                    assert.equal(result.stats1[year].counter2, 1, "Invalid stats value")
                    assert.equal(result.stats1[year][month].counter2, 1, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day].counter2, 1, "Invalid stats value")
                    assert.equal(result.stats1[year][month][day][hour].counter2, 1, "Invalid stats value")
                    return done();
                })
            })

        });
    });
});
