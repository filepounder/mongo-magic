const $merge = require('deepmerge');
const $mongo = require('mongodb');
const $qs = require('querystring');
const _s = require('underscore.string');
const $check = require('check-types');
const oDataParser = require('./oDataParser.js');

const _defaultLimit = 50;

class MongoQuery {
    constructor(query, defaults = {}) {
        var originalQuery = query;
        if (!$check.assigned(query)) {
            originalQuery = {};
        }

        if ($check.string(query)) {
            originalQuery = $qs.parse(query);
        } else if ($check.object(query)) {
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
        if (!rawQueryString) {
            return null;
        }
        let rawQuery = null;

        if (!$check.object(rawQueryString)) {
            try {
                rawQuery = JSON.parse(rawQueryString);
            } catch (exp) {
                throw new Error("Invalid Raw Query String")
            }
        }else{
            rawQuery = rawQueryString;
        }


        const mergeRawQueryRecursive=(obj, parent, parentKey)=> {
            for (let key in obj) {
                if (!obj.hasOwnProperty(key)) continue;

                if ($check.object(obj[key])){
                    mergeRawQueryRecursive(obj[key], obj, key);
                } else if($check.array(obj[key])){
                    for (let i=0;i<obj[key].length;i++){
                        mergeRawQueryRecursive(obj[key][i], obj[key], i);
                    }
                } else {
                    if (key === "$date") {
                        parent[parentKey] = new Date(obj[key]);
                    } else if (key === "$objectId"&&$check.string(obj[key])) {
                        parent[parentKey] = new $mongo.ObjectID(obj[key]);
                    }
                    else if (key === "$int") {
                        parent[parentKey] = parseInt(obj[key]);
                    }else if (key === "$float") {
                        parent[parentKey] = parseFloat(obj[key]);
                    }
                    else if (key === "$string") {
                        parent[parentKey] = $check.assigned(obj[key])&&obj[key].toString?obj[key].toString():obj[key];
                    }
                }
            }
        };



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
        where = $merge(where, parsedQuery.filter);
    if (parsedQuery.rawQuery)
        where = $merge(where, parsedQuery.rawQuery);
    if (defaults)
        where = $merge(where, defaults);

    return Object.keys(where).length === 0 ? null : where;
}

module.exports = MongoQuery;
