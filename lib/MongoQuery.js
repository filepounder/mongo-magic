const merge = require('merge');
const mongo = require('mongodb');
const qs = require('querystring');
const _s = require('underscore.string');
const checkTypes = require('check-types');
const oDataParser = require('./oDataParser.js');

const _defaultLimit = 50;

class MongoQuery {
    constructor(query, defaults = {}) {
        var originalQuery = query;
        if (!checkTypes.assigned(query)) {
            originalQuery = {};
        }

        if (checkTypes.string(query)) {
            originalQuery = qs.parse(query);
        } else if (checkTypes.object(query)) {
            originalQuery = query;
        } else {
            throw new Error("Invalid parameter: query");
        }

        this.originalQuery = originalQuery;
        this.parsedQuery = {};
        this.parsedQuery.select = getSelect(originalQuery);
        this.parsedQuery.orderBy = getSortOrOrderBy(originalQuery);
        this.parsedQuery.limit = getTopOrLimit(originalQuery);
        this.parsedQuery.top = this.parsedQuery.limit;
        this.parsedQuery.sort = this.parsedQuery.orderBy;
        this.parsedQuery.skip = getSkip(originalQuery);

        if (originalQuery.$rawQuery) this.parsedQuery.rawQuery = MongoQuery.parseRawQuery(originalQuery.$rawQuery);
        if (originalQuery.$filter) this.parsedQuery.filter = oDataParser.parse(originalQuery.$filter);
        this.parsedQuery.query = getQuery(this.parsedQuery, defaults);
    }

    static parseRawQuery(rawQueryString) {
        if (checkTypes.object(rawQueryString)) return rawQueryString;
        var rawQuery = null;
        if (!rawQueryString) {
            return null;
        }

        function mergeRawQueryRecursive(obj, parent, parentKey) {
            for (let key in obj) {
                if (!obj.hasOwnProperty(key)) continue;

                if (checkTypes.object(obj[key])) mergeRawQueryRecursive(obj[key], obj, key);
                else {
                    if (key === "$date") {
                        parent[parentKey] = new Date(obj[key]);
                        break;
                    } else if (key === "$objectId") {
                        parent[parentKey] = new mongo.ObjectID(obj[key]);
                        break;
                    }
                    else continue;
                }
            }
        }

        try {
            rawQuery = JSON.parse(rawQueryString);
        } catch (exp) {
            throw new Error("Invalid Raw Query String")
        }

        mergeRawQueryRecursive(rawQuery);

        return rawQuery;
    }
}

function getSelect(query) {
    if (!query.$select) return null;

    let selectedFields = {};
    let hasNegative = false;
    let hasPositive = false;
    let selectFields = query.$select.split(",");
    for (let selectField of selectFields) {
        selectField = selectField.trim();
        if (selectField.substring(0, 1) === "-") {
            selectedFields[selectField.substring(1)] = false;
            hasNegative = true;
        } else {
            selectedFields[selectField] = true;
            hasPositive = true;
        }
    }

    if (hasNegative && hasPositive) throw new Error("Select cannot have inclusion and exclusion together");

    return selectedFields
}

function getSortOrOrderBy(query) {
    if (!query.$orderby && !query.$sort) return null;
    let sortStr = query.$orderby ? query.$orderby : query.$sort;
    return sortStr.split(",").reduce((orderByFields, orderByField) => {
        orderByField = orderByField.trim();
        if (_s.endsWith(orderByField, " desc")) orderByFields[orderByField.replace(" desc", "")] = -1;
        else if (_s.endsWith(orderByField, " asc")) orderByFields[orderByField.replace(" asc", "")] = 1;
        else if (_s.startsWith(orderByField, "-")) orderByFields[orderByField.substring(1)] = -1;
        else if (_s.startsWith(orderByField, "+")) orderByFields[orderByField.substring(1)] = 1;
        else orderByFields[orderByField] = 1;
        return orderByFields;
    }, {});
}

function getTopOrLimit(query) {
    let limit = _defaultLimit;
    if (query.$top) limit = parseInt(query.$top);
    else if (query.$limit) limit = parseInt(query.$limit);

    if (isNaN(limit)) {
        limit = _defaultLimit;
    }

    return limit;
}

function getSkip(query) {
    if (!query.$skip) return 0;
    let skip = parseInt(query.$skip);
    if (isNaN(skip)) skip = 0;
    return skip;
}

function getQuery(parsedQuery, defaults) {
    var where = {};
    if (parsedQuery.filter)
        where = merge.recursive(where, parsedQuery.filter);
    if (parsedQuery.rawQuery)
        where = merge.recursive(where, parsedQuery.rawQuery);
    if (defaults)
        where = merge.recursive(where, defaults);

    return Object.keys(where).length === 0 ? null : where;
}

module.exports = MongoQuery;
