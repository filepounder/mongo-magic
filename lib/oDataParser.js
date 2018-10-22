const oDataParser = require("odata-parser");
const _s = require('underscore.string');

function Node(type, left, right, func, args) {
    this.type = type;
    this.left = left;
    this.right = right;
    this.func = func;
    this.args = args;
}

Node.prototype.transform = function () {
    var result = {};

    if (this.left.name) {
        this.left.name = this.left.name.replace(/\//g, ".");
    }

    if (this.type === "eq" && this.right.type === 'literal') {
        result[this.left.name] = this.right.value;
    }

    if (this.type === "lt" && this.right.type === 'literal') {
        result[this.left.name] = {"$lt": this.right.value};
    }

    if (this.type === "gt" && this.right.type === 'literal') {
        result[this.left.name] = {"$gt": this.right.value};
    }

    if (this.type === "ge" && this.right.type === 'literal') {
        result[this.left.name] = {"$gte": this.right.value};
    }

    if (this.type === "le" && this.right.type === 'literal') {
        result[this.left.name] = {"$lte": this.right.value};
    }

    if (this.type === "ne" && this.right.type === 'literal') {
        result[this.left.name] = {"$ne": this.right.value};
    }

    if (this.type === "and") {
        result["$and"] = result["$and"] || [];
        result["$and"].push(new Node(this.left.type, this.left.left, this.left.right, this.func, this.args).transform());
        result["$and"].push(new Node(this.right.type, this.right.left, this.right.right, this.func, this.args).transform());
    }

    if (this.type === "or") {
        result["$or"] = result["$or"] || [];
        result["$or"].push(new Node(this.left.type, this.left.left, this.left.right, this.func, this.args).transform());
        result["$or"].push(new Node(this.right.type, this.right.left, this.right.right, this.func, this.args).transform());
    }

    if (this.type === "functioncall") {
        switch (this.func) {
            case "substringof":
                substringof(this, result)
        }
    }

    return result;
}


function substringof(node, result) {
    var prop = node.args[0].type === "property" ? node.args[0] : node.args[1];
    var lit = node.args[0].type === "literal" ? node.args[0] : node.args[1];

    result[prop.name] = new RegExp(lit.value);
}

module.exports = {
    parse: function (filterString) {
        var encodedQuery = decodeURIComponent("$filter=" + filterString);
        var encodedFilter = oDataParser.parse(encodedQuery);
        if (encodedFilter.error) {
            throw new Error(encodedFilter.error);
        }
        return new Node(encodedFilter.$filter.type, encodedFilter.$filter.left, encodedFilter.$filter.right, encodedFilter.$filter.func, encodedFilter.$filter.args).transform();
    }

}
