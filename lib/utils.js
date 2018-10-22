const ObjectID = require('mongodb').ObjectID;

module.exports = {
    generateId: function () {
        return new ObjectID();
    },
    isValidId: function (id) {
        if (!id) {
            return false;
        }
        if (id.toString().length !== 24) {
            return false;
        }

        return ObjectID.isValid(id.toString());
    },
    parseId: function (id) {
        if (this.isValidId(id)) {
            return new ObjectID(id.toString());
        } else {
            return null;
        }
    }
};
