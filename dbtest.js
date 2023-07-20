const MongoClient = require('mongodb').MongoClient;
const merge = require('lodash/merge');
const ifElse = require('ramda/src/ifElse');
const isNil = require('ramda/src/isNil');
const identity = require('ramda/src/identity');
const { ObjectId } = require('mongodb');
const retryPromise = require('bluebird-retry');

const assoc = require('ramda/src/assoc');
const prop = require('ramda/src/prop');
const omit = require('ramda/src/omit');


// Connection URL
const url = 'mongodb://localhost:27017'; // replace with your MongoDB server URL if not running locally

// Database Name
const dbName = 'telemmo'; // replace with your database name

// Create a new MongoClient
const client = new MongoClient(url, { useUnifiedTopology: true });

client.connect();
const db = client.db(dbName);
const collection = db.collection('collection');



const renameId = obj =>
  assoc('id', prop('_id', obj), omit('_id', obj))

const retry = func =>
  retryPromise(func, { max_tries: 4, interval: 500 })

function update (collection, query, document, options) {



    // Add the $set operator here.
    const sealed = { $set: merge({}, document) };
    // const opts = merge({ returnOriginal: false }, options || {});
    const opts = merge({ returnOriginal: false }, options || {});
  
    console.log(`Update called with query: ${JSON.stringify(query)}`);
    console.log(`Update called with document: ${JSON.stringify(sealed)}`);
    console.log(`Update called with options: ${JSON.stringify(opts)}`);
  
  
    return collection.findOne(query)
      .then(findResult => {
        console.log(`Find result before update: ${JSON.stringify(findResult)}`);
        return findResult;
      })
      .then(() => retry(() =>
    // return retry(() =>
      collection.findOneAndUpdate(query, sealed, opts)
        .then(result => {
          console.log("Update result after calling findOneAndUpdate:", result);
          return result.value; // Extract the 'value' property
        })
//        .then(prop('value'))
        .then(ifElse(
          isNil,
          identity,
          renameId,
        ))
        .then(result => {
          console.log("Update result:", result);
          return result;
        })
        .catch(err => {
          console.error('Update error:', err);
          throw err;  // Rethrow the error to handle it in the calling code
        })
    ));
  }


// let query = {
//     'teams.members': {
//         $elemMatch: {
//         id: { $in: [new ObjectId('64b7aae8e9ecfea7a880782e')] },
// //        id: { $in: combatMemberIds(combat) },

//       },
//   },
//   }

query = {"teams.members": {$elemMatch:{"name":"Vincenot Figo"}}}

console.log(update(collection, query, { 'token': 'test4' }, { upsert: true, returnOriginal: false }))