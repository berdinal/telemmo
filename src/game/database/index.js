require('dotenv').config();

import { MongoClient } from 'mongodb'
import Promise from 'bluebird'

import dao from './dao'

function build (db) {
  return {
    player: dao.build(db.collection('player')),
    character: dao.build(db.collection('character')),
    combat: dao.build(db.collection('combat')),
  }
}

async function connect () {
  let db
  try {
    console.log(`Connecting to the database...`)
    console.log(`MONGO_URL: ${process.env.MONGO_URL}`)
    const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    const dbName = process.env.MONGO_URL.split('/').pop();
    db = client.db(dbName);
    console.log('Successfully connected to the database');
    return build(db);
  } catch (err) {
    console.error(`Failed to connect to the database. ${err.stack}`);
    process.exit(1); // Exit process with failure
  }
  return build(db)
}

export default {
  connect,
}

