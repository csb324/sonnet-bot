import Mongo, { MongoClient } from "mongodb";
import config from "./config";

// https://mlab.com/databases/tweets_that_rhyme (for the sonnetbot)

let url = "mongodb://" + config.DB_USERNAME + ":" + config.DB_PASSWORD + "@ds157248.mlab.com:57248/" + config.DB_NAME;

export function execute(batch, callback) {
	batch.execute(function(err, result) {
		if(!err) {
			console.log(result);

      var upserts = result.nUpserted;
      console.log("there were " + upserts + " upserts.");

		} else {
			console.log(err);
		}
    return callback(result);
  });
}


export function mongoInsert(insertFunction, options) {
	return new Promise((resolve, reject) => {
		MongoClient.connect(url, function(err, db) {
			if (!err) {

				console.log("Connected correctly to server");

				insertFunction(db, () => {
					db.close();
					resolve();
				}, options);

			} else {
				console.log(err);
				reject();

			}
		});		
	})

}

// this returns a list of word OBJECTS (not words)
function getFromCollection(collectionName, query) {

	if (!query) {
		query = {};
	}

	return new Promise((resolve, reject) => {
		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);
				return;
			}

			db.collection(collectionName).find(query).toArray(function(err, docs) {

				db.close();

				if (err) {
					reject(err);
				}

				resolve(docs);
			});
		});
	})
};


export function getWords(query) {
	return getFromCollection('words', query);
}

export function getTweets(query) {
	return getFromCollection('tweets', query);
}

export function getWordsWithOneTweet() {

	return new Promise((resolve, reject) => {
		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);
				return;
			}

			resolve(db.collection('tweets').distinct("word"));
		});
	})
}


// this gets rid of all your tweets
export function clearTweets() {
	return new Promise((resolve, reject) => {
		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);
				return;
			}

			db.collection('tweets').deleteMany({});
			db.close();
			resolve();
		});
	});
}


export function addTweet(word, tweet) {

	return new Promise((resolve, reject) => {

		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				return;
			}

			db.collection('words').findOne({
				word: word
			}).then((existingWord) => {

				return db.collection('tweets').insert({
					tweet: tweet,
					word: word,
					sound: existingWord["sound"]
				});

			}).then(() => {

				db.close();

				resolve();

			}).catch((err) => {
				console.log("error");
				db.close();

				reject(err);

			});
		});
	});
}
