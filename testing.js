var mongoUtils=require('./index.js');
var mongo=require("mongodb");
var util=require('util');

console.log(mongoUtils.utils.generateId());
console.log(mongoUtils.utils.isValidId('57ef64b1e0a04c31ac9bbe1c'));
console.log(mongoUtils.utils.isValidId('57ef64b1e0a04c31ac9bbe1'));
console.log(mongoUtils.utils.parseId('57ef64b1e0a04c31ac9bbe1c'));

var testQuery=new mongoUtils.MongoQuery(
    "$select=a,b, c" +
    "&$sort=c,-a,b desc" +
    "&$skip=2" +
    "&$limit=100" +
    "&$filter=field eq 'val'" +
    '&$rawQuery={"$and":[{"field2":1}]}'
    ,{val1:123});
console.log(util.inspect(testQuery,{depth:null}));

testQuery=new mongoUtils.MongoQuery({
    $select:"a,b, c",
    $rawQuery:{val2:3}
}
   ,{val1:123});
console.log(util.inspect(testQuery,{depth:null}));

function dbConnected(err, database) {
    if (err) return console.error(err);
    console.log("connected to database:" + database.serverConfig.host + ":" + database.databaseName);

    var qStr='$limit=20&$skip=1&';
    var mQuery=new mongoUtils.MongoQuery(qStr,{val1:123});
    var collection=new mongoUtils.Collection(database.collection("test1"));
    collection.query(mQuery,function(err,results){
        if (err)return console.error(err);
        console.log(util.inspect(results,{depth:null}));
    });

    try{
        collection.query("$filter=test",function(err,results){
            if (err)return console.error(err);
            console.log(util.inspect(results,{depth:null}));
        })
    }catch (exp){console.error(exp)}

}

mongo.MongoClient.connect( "mongodb://127.0.0.1/testutils",dbConnected);