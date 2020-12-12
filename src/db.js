import Mongo, { MongoClient } from "mongodb";

// https://mlab.com/databases/tweets_that_rhyme (for the sonnetbot)

// ----- how to connect to mongo shell -----
// mongo ds157248.mlab.com:57248/tweets_that_rhyme -u <username> -p <password>
//
// ----- useful mongo shell commands ------
// db.tweets.distinct("word").length
// db.words.count()
// db.tweets.distinct("sound").length
// db.rhymes.count()

// db.tweets.aggregate([
// 	{ $group: {
// 		_id: "word",
// 		"count": {
// 			$sum: 1
// 		}
// 	}}, {
// 		$sort: {
// 			"count": 1
// 		}
// 	}]);

let config;
if (process.env.NODE_ENV == "production") {
  config = {
	  DB_NAME: process.env.DB_NAME,
	  DB_PASSWORD: process.env.DB_PASSWORD,
	  DB_USERNAME: process.env.DB_USERNAME,  	
  };
} else {
  config = require("./config.js");
};

let url = "mongodb://" 
	+ config.DB_USERNAME + ":" 
	+ config.DB_PASSWORD
	+ "@tweets-that-rhyme-shard-00-00.aq6zk.mongodb.net:27017,tweets-that-rhyme-shard-00-01.aq6zk.mongodb.net:27017,tweets-that-rhyme-shard-00-02.aq6zk.mongodb.net:27017/"
	+ config.DB_NAME
	+ "?ssl=true&replicaSet=atlas-ndzuwm-shard-0&authSource=admin&retryWrites=true&w=majority";

	export function execute(batch, callback) {
	batch.execute(function(err, result) {
		if(!err) {
			console.log(result);

      var upserts = result.nUpserted;
      var deletes = result.nRemoved;
      console.log("there were " + upserts + " upserts.");
      console.log("there were " + deletes + " deletes.");

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

			db.collection(collectionName)
				.find(query).toArray(function(err, docs) {
					db.close();

					if (err) {
						reject(err);
					}
					resolve(docs);
				});
		});
	})
};


// similarly, returns a random OBJECT, not a string
export function getRandomFromCollection(collectionName, query) {
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
			
			let searchParameters = [{ $match: query }, { $sample: { size: 1 }}];

			resolve(db.collection(collectionName).findOne(query));

			// db.collection(collectionName)
			// 	.aggregate(searchParameters)
			// 	.toArray((err, docs) => {
			// 		if (err) {
			// 			console.log(err);
			// 			reject(err);
			// 			return;
			// 		}
			// 		console.log(docs);
			// 		resolve(docs[0]);
			// 	});

		});
	})
};


// just for convenience
export function getWords(query) {
	return getFromCollection('words', query);
}

export function getTweets(query) {
	return getFromCollection('tweets', query);
}

export function getRandomTweet(query) {
	console.log(query);

	return getRandomFromCollection('tweets', query).then((tweetObject) => {
		console.log("so do we have a tweet object or what");
		return tweetObject;
	}).then((tweetObject) => {
		if (tweetObject) {
			return tweetObject;
		} else {
			let newSearch = query;
			console.log("bitch this is a loop");
			newSearch['shakespeare'] = !newSearch['shakespeare'];
			return getRandomTweet(newSearch);
		}
	}).catch((err) => {
		console.log("something is up");
		console.log(err);
	});
}



export function getSound(existingSounds) {
	
	console.log("getting a sound");

	return getRandomTweet({"sound": {"$nin": existingSounds}}).then((tweet) => {
		console.log("got a tweet - whats ur sound");
		return tweet["sound"];
	});
};


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

export function getWordsWithLessThanNTweets(maxTweets) {
	return new Promise((resolve, reject) => {
		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);
				return;
			}

			db.collection('tweets').aggregate([
				{ $group: 
					{
						_id: "$word", 
						"count": { $sum: 1 } 
					} 
				}, 	{ 
					$match: { 
						"count": { $lte: maxTweets } 
					}
				}
			]).toArray((err, docs) => {
				if (err) {
					console.log(err);
					reject(err);
					return;
				}

				resolve(docs.map((doc) => {
					return doc._id;
				}));
			});
		});
	});
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

export function removeTweet(tweetId) {
	return new Promise((resolve, reject) => {
		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);
				return;
			}

			db.collection('tweets').deleteOne({ _id: tweetId }).then(() => {
				db.close();
				resolve();				
			});
		});

	});
}
export function addTweet(word, tweet, isShakespeare) {

	console.log("adding a tweet");

	if (!isShakespeare) {
		isShakespeare = false;
	}

	return new Promise((resolve, reject) => {

		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);				
				return;
			}

			db.collection('words').findOne({
				word: word
			}).then((existingWord) => {

				return db.collection('tweets').findOneAndUpdate({
					tweet: tweet
				}, {
					$set: {
						word: word,
						sound: existingWord["sound"],
						shakespeare: isShakespeare
					}
				}, {
					upsert: true
				});

			}).then(() => {

				db.close();

				resolve();

			}).catch((err) => {
				console.log("error");
				console.log(err);
				db.close();

				reject(err);

			});
		});
	});
}
