import {
  partial,
  always,
  identity,
  ifElse,
  isNil,
  merge,
  assoc,
  prop,
  pipe,
  omit,
  map,
} from 'ramda'

import retryPromise from 'bluebird-retry'

const queries = {
  notDeleted: { deletedAt: { $exists: false } },
}

const renameId = obj =>
  assoc('id', prop('_id', obj), omit('_id', obj))

const retry = func =>
  retryPromise(func, { max_tries: 4, interval: 500 })

function find (collection, query) {
  return retry(() =>
    collection.find(merge(queries.notDeleted, query))
      .toArray()
      .then(map(renameId))
  )
}

// function update (collection, query, document, options) {
//   const sealed = merge({}, document)
//   const opts = merge({ returnOriginal: false }, options || {})

//   return retry(() =>
//     collection.findOneAndUpdate(query, sealed, opts)
//       .then(prop('value'))
//       .then(ifElse(
//         isNil,
//         identity,
//         renameId,
//       ))
//   )
// }


function executeFindAndLogResult(actions, query) {
  return actions.find(query)
    .then(result => {
//      console.log(`Query result: ${JSON.stringify(result)}`);
      return result;
    })
    .catch(error => {
      console.error(`Error executing query: ${error.message}`);
      throw error; // or handle it according to your needs
    });
}


function update (collection, query, document, options) {
  // Add the $set operator here.
  const sealed = { $set: merge({}, document) };
  // const opts = merge({ returnOriginal: false }, options || {});
  const opts = merge({ returnDocument: 'after' }, options || {});

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
      // .then(result => {
      //   console.log("Update result after calling findOneAndUpdate:", result);
      //   return result.value; // Extract the 'value' property
      // })
      .then(prop('value'))
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


function create (collection, document) {
  const now = new Date()
  const timestamps = {
    createdAt: now,
    updatedAt: now,
  }

  const sealed = merge(document, timestamps)

  return retry(() =>
    collection.insertOne(sealed)
      .then(pipe(always(sealed), renameId))
  )
}

function destroy (collection, query, options) {
  if (options.hard) {
    return retry(() => collection.deleteOne(query))
  }

  return retry(() => collection.findOneAndUpdate(
    query, { $set: { deletedAt: new Date() } }))
}

function aggregate (collection, pipeline) {
  return retry(() => collection.aggregate(pipeline).toArray())
}

function build (collection) {
  return {
    find: partial(find, [collection]),
    update: partial(update, [collection]),
    create: partial(create, [collection]),
    destroy: partial(destroy, [collection]),
    aggregate: partial(aggregate, [collection]),
  }
}


// function build (collection) {
//   console.log(`Building actions for collection: ${collection}`);
//   return {
//     find: async (...args) => {
//       console.log(`find called with arguments: ${JSON.stringify(args)}`);
//       const result = await partial(find, [collection])(...args);
//       console.log(`find returned: ${JSON.stringify(result)}`);
//       return result;
//     },
//     update: async (...args) => {
//       console.log(`update called with arguments: ${JSON.stringify(args)}`);
//       const result = await partial(update, [collection])(...args);
//       console.log(`update returned: ${JSON.stringify(result)}`);
//       return result;
//     },
//     create: async (...args) => {
//       console.log(`create called with arguments: ${JSON.stringify(args)}`);
//       const result = await partial(create, [collection])(...args);
//       console.log(`create returned: ${JSON.stringify(result)}`);
//       return result;
//     },
//     destroy: async (...args) => {
//       console.log(`destroy called with arguments: ${JSON.stringify(args)}`);
//       const result = await partial(destroy, [collection])(...args);
//       console.log(`destroy returned: ${JSON.stringify(result)}`);
//       return result;
//     },
//     aggregate: async (...args) => {
//       console.log(`aggregate called with arguments: ${JSON.stringify(args)}`);
//       const result = await partial(aggregate, [collection])(...args);
//       console.log(`aggregate returned: ${JSON.stringify(result)}`);
//       return result;
//     },
//   }
// }



export default {
  build
}
