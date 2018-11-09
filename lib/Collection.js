const moment = require('moment');
const _s = require('underscore.string');
const checkTypes = require('check-types');
const MongoQuery = require('./MongoQuery.js');

const _defaultQueryTimeoutMS = 120000;
const _specialFields = ["$select", "$limit", "$top", "$filter", "$skip", "$sort", "$orderby", "$rawQuery", "$aggregate", "$group"];

class Collection {
    constructor(collection, options) {
        if (!collection) throw new Error("Missing Collection");
        this.options = options ? options : {};
        if (!this.options.queryTimeout) this.options.queryTimeout = _defaultQueryTimeoutMS;
        this.collection = collection;
    }

    count(query, callback) {
        let baseObj = this;
        if (!checkTypes.instanceStrict(query, MongoQuery)) throw new Error("Invalid query object");

        function countRetrieved(err, count) {
            if (err) return callback(err);
            if (!count) return callback(null, 0);
            else return callback(null, count);
        }

        try {
            if (baseObj.collection.hasOwnProperty('countDocuments')) {
                baseObj.collection.countDocuments(query.parsedQuery.query, countRetrieved);
            } else {
                // todo: remove this once we've completed the mongodb package updates across all systems
                baseObj.collection.count(query.parsedQuery.query, countRetrieved);
            }
        } catch (exp) {
            return callback(exp);
        }
    }

    queryAsCursor(query) {
        let baseObj = this;
        if (!checkTypes.instanceStrict(query, MongoQuery)) throw new Error("Invalid query object");

        let cur = baseObj.collection.find(query.parsedQuery.query);

        //top and limit
        cur.limit(query.parsedQuery.limit);

        //select
        if (query.parsedQuery.select) cur.project(query.parsedQuery.select);

        //sort
        if (query.parsedQuery.sort) cur.sort(query.parsedQuery.sort);

        //orderby
        if (query.parsedQuery.orderby) cur.sort(query.parsedQuery.orderby);

        //skip
        if (query.parsedQuery.skip) cur.skip(query.parsedQuery.skip);
        else cur.skip(0);

        cur.maxTimeMS(baseObj.options.queryTimeout);

        return cur;
    }

    query(query, callback) {
        let baseObj = this;
        if (!checkTypes.instanceStrict(query, MongoQuery)) throw new Error("Invalid query object");

        try {
            let cur = baseObj.queryAsCursor(query);

            cur.toArray(function (err, results) {
                if (err) {
                    return callback(err);
                }
                if (!results) {
                    return callback(null, []);
                }
                return callback(null, results);
            });
        } catch (exp) {
            return callback(exp);
        }
    }

    queryAsStream(query) {
        let baseObj = this;
        if (!checkTypes.instanceStrict(query, MongoQuery)) throw new Error("Invalid query object");
        let cur = baseObj.queryAsCursor(query);
        return cur.stream();
    }

    updateStats(options, callback) {
        let baseObj = this;
        if (!options.statsField) throw new Error("Missing stats field");
        if (!options.increments) throw new Error("Missing increments field");
        if (!options.date) throw new Error("Missing date field");
        if (!options.query) throw new Error("Missing query");
        let incrementFields = null;
        if (checkTypes.array(options.increments)) {
            incrementFields = options.increments;
        } else if (checkTypes.object(options.increments)) {
            incrementFields = [options.increments];
        } else {
            throw new Error("Invalid increments");
        }

        let processingDate = new moment(options.date).utc();

        let update = {$inc: {}};
        let basePath = options.statsField + ".";
        let yearPath = basePath + processingDate.year();
        let monthPath = yearPath + "." + _s.lpad(processingDate.month() + 1, 2, '0');
        let dayPath = monthPath + "." + _s.lpad(processingDate.date(), 2, '0');
        let hourPath = dayPath + "." + _s.lpad(processingDate.hour(), 2, '0');

        for (let increment of incrementFields) {
            update.$inc[basePath + increment.field] = increment.value;
            update.$inc[yearPath + "." + increment.field] = increment.value;
            update.$inc[monthPath + "." + increment.field] = increment.value;
            update.$inc[dayPath + "." + increment.field] = increment.value;
            update.$inc[hourPath + "." + increment.field] = increment.value;
        }
        baseObj.collection.updateOne(options.query, update, callback);
    }
}

module.exports = Collection;
