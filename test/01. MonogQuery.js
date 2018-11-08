const assert = require('assert');
const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const MongoQuery = require('../lib').MongoQuery;

const config = {
    'databaseName': 'mongoutilstests',
    'connectionString': 'mongodb://localhost:27017',
    'connectionOptions': {
        'useNewUrlParser': true
    }
};

let client = null;
let _db = null;

describe('Mongo Query', function () {
    before(function (done) {
        async.waterfall([
            (cb) => {
                client = new MongoClient(config.connectionString, config.connectionOptions);

                client.connect(function (err) {
                    if (err) {
                        return cb(err);
                    }

                    cb();
                });
            },
            (cb) => {
                _db = client.db(config.databaseName);

                _db.collections(function (err, collections) {
                    if (err) {
                        return cb(err);
                    }

                    async.each(collections,
                        function (item, itemCallback) {
                            item.deleteMany({}, itemCallback);
                        },
                        function (err) {
                            cb(err);
                        }
                    );
                });
            }
        ], function (err) {
            if (err) {
                console.log(err);
            }

            done(err);
        });
    });

    after(function (done) {
        if (client) {
            client.close();
        }

        done();
    });

    describe('Query', function () {
        it('should throw an error when no config specified', function (done) {
            assert.throws(function () {
                let mongoQuery = new MongoQuery();
            }, Error, 'No error thrown');
            done();
        });

        it('should parse a simple query string', function (done) {
            let mongoQuery = new MongoQuery('$sort=-field1,field2&$select=field1,field2');

            assert.deepEqual(mongoQuery.parsedQuery.select, {field1: true, field2: true}, 'Invalid Select');
            assert.deepEqual(mongoQuery.parsedQuery.sort, {field1: -1, field2: 1}, 'Invalid Sort');
            done();
        });

        it('should parse a complex select with inclusions', function (done) {
            let mongoQuery = new MongoQuery('$select=field1,field2');

            assert.deepEqual(mongoQuery.parsedQuery.select, {field1: true, field2: true}, 'Invalid Select');
            done();
        });

        it('should parse a complex select with exclusions', function (done) {
            let mongoQuery = new MongoQuery('$select=-field1,-field2');

            assert.deepEqual(mongoQuery.parsedQuery.select, {field1: false, field2: false}, 'Invalid Select');
            done();
        });

        it('should throw an error on a select with exclusions and inclusions', function (done) {
            assert.throws(function () {
                let mongoQuery = new MongoQuery('$select=field1,-field2');

            }, Error, 'No error thrown');
            done();
        });

        it('should throw an error on a select with exclusions and inclusions 2', function (done) {
            assert.throws(function () {
                let mongoQuery = new MongoQuery('$select=-field1,field2');

            }, Error, 'No error thrown');
            done();
        });

        it('should parse a complex filter', function (done) {
            let mongoQuery = new MongoQuery('$filter=field1/field2 eq \'a\'');

            assert.deepEqual(mongoQuery.parsedQuery.query, {'field1.field2': 'a'}, 'Invalid Select');
            done();
        });

        it('should parse a raw query', function (done) {
            let mongoQuery = new MongoQuery('$rawQuery={"field1.field2":{"$date":"2016-01-01T00:00:00Z"}}');

            assert.deepEqual(mongoQuery.parsedQuery.query, {'field1.field2': new Date('2016-01-01T00:00:00Z')}, 'Invalid Raw Query');
            done();
        });

        it('should parse a raw query and filter', function (done) {
            let mongoQuery = new MongoQuery('$filter=field2 eq \'a\'&$rawQuery={"field1":{"$date":"2016-01-01T00:00:00Z"}}');

            assert.deepEqual(mongoQuery.parsedQuery.query, {
                field1: new Date('2016-01-01T00:00:00Z'),
                field2: 'a'
            }, 'Invalid Query');
            done();
        });

        it('should parse a raw query and filter with a default', function (done) {
            let mongoQuery = new MongoQuery('$filter=field2 eq \'a\'&$rawQuery={"field1":{"$date":"2016-01-01T00:00:00Z"}}', {field3: 3});

            assert.deepEqual(mongoQuery.parsedQuery.query, {
                field1: new Date('2016-01-01T00:00:00Z'),
                field2: 'a',
                field3: 3
            }, 'Invalid Query');
            done();
        });
    });
});
