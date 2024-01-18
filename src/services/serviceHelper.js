const axios = require('axios');
const mongodb = require('mongodb');
const config = require('config');

const { MongoClient } = mongodb;
// const user = encodeURIComponent(config.database.username);
// const password = encodeURIComponent(config.database.password);
// const authMechanism = 'DEFAULT';
// const mongoUrl = `mongodb://${user}:${password}@${config.database.url}:${config.database.port}?authMechanism=${authMechanism}&authSource=admin`;
const mongoUrl = `mongodb://${config.database.url}:${config.database.port}/`;

let openDBConnection = null;

async function databaseConnection() {
  if (!openDBConnection) {
    // eslint-disable-next-line no-use-before-define
    await initiateDB();
  }
  return openDBConnection;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// MongoDB functions
async function connectMongoDb(url) {
  const connectUrl = url || mongoUrl;
  const mongoSettings = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 100,
  };
  const db = await MongoClient.connect(connectUrl, mongoSettings);
  return db;
}

async function initiateDB() {
  openDBConnection = await connectMongoDb();
  return true;
}

async function distinctDatabase(database, collection, distinct, query) {
  const results = await database.collection(collection).distinct(distinct, query);
  return results;
}

async function findInDatabase(database, collection, query, projection) {
  const results = await database.collection(collection).find(query, projection).toArray();
  return results;
}

async function findInDatabaseSort(database, collection, query, projection, sort) {
  const results = await database.collection(collection).find(query, projection).sort(sort).toArray();
  return results;
}

async function findOneInDatabase(database, collection, query, projection) {
  const result = await database.collection(collection).findOne(query, projection);
  return result;
}

async function findOneAndUpdateInDatabase(database, collection, query, update, options) {
  const passedOptions = options || {};
  const result = await database.collection(collection).findOneAndUpdate(query, update, passedOptions);
  return result;
}

async function insertOneToDatabase(database, collection, value) {
  const result = await database.collection(collection).insertOne(value);
  return result;
}

async function updateOneInDatabase(database, collection, query, update, options) {
  const passedOptions = options || {};
  const result = await database.collection(collection).updateOne(query, update, passedOptions);
  return result;
}

async function updateInDatabase(database, collection, query, projection) {
  const result = await database.collection(collection).updateMany(query, projection);
  return result;
}

async function findOneAndDeleteInDatabase(database, collection, query, projection) {
  const result = await database.collection(collection).findOneAndDelete(query, projection);
  return result;
}

async function removeDocumentsFromCollection(database, collection, query) {
  // to remove all documents from collection, the query is just {}
  const result = await database.collection(collection).deleteMany(query);
  return result;
}

async function dropCollection(database, collection) {
  const result = await database.collection(collection).drop();
  return result;
}

async function collectionStats(database, collection) {
  // to remove all documents from collection, the query is just {}
  const result = await database.collection(collection).stats();
  return result;
}

/**
 * Method to insert into database multiple documents to the same collection.
 * @constructor
 * @param {string} database - (Required) database to be used
 * @param {*} collection - (Required) name of collection
 * @param {JSON} value - (Required) value to be stored
 * @param {number} expireTimeInSeconds - (Optional) - time in seconds to expire the documents
 * @returns
 */
async function addMultipleDocuments(database, collection, value, expireTimeInSeconds = 0) {
  // inserting multiple documents into the collection
  const result = await database.collection(collection).insertMany(value);
  // if expireTimeInSeconds has value different than null, we know we need to create a index to expire the document in expireTimeInSeconds
  if (expireTimeInSeconds !== 0) {
    await database.collection(collection).createIndex({ CreatedAt: 1 }, { expireAfterSeconds: expireTimeInSeconds });
  }
  return result;
}

// helper function for timeout on axios connection
const axiosGet = (url, options = {
  timeout: 20000,
}) => {
  const abort = axios.CancelToken.source();
  const id = setTimeout(
    () => abort.cancel(`Timeout of ${options.timeout}ms.`),
    options.timeout,
  );
  return axios
    .get(url, { cancelToken: abort.token, ...options })
    .then((res) => {
      clearTimeout(id);
      return res;
    });
};

module.exports = {
  connectMongoDb,
  distinctDatabase,
  findInDatabase,
  findInDatabaseSort,
  findOneInDatabase,
  findOneAndUpdateInDatabase,
  insertOneToDatabase,
  updateInDatabase,
  updateOneInDatabase,
  findOneAndDeleteInDatabase,
  removeDocumentsFromCollection,
  dropCollection,
  collectionStats,
  axiosGet,
  delay,
  initiateDB,
  databaseConnection,
  addMultipleDocuments,
};
