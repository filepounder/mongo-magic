const ObjectID = require('mongodb').ObjectID;

class Utils{
    static generateId () {
        return new ObjectID();
    }
    static isValidId (id) {
        if (!id) {
            return false;
        }
        if (id.toString().length !== 24) {
            return false;
        }

        return ObjectID.isValid(id.toString());
    }
    static parseId (id) {
        if (Utils.isValidId(id)) {
            return new ObjectID(id.toString());
        } else {
            return null;
        }
    }
}

module.exports = Utils;