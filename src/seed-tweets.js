import Mongo, { MongoClient } from "mongodb";
import config from "./config";
import { rhymes } from "./rhymes";
import Promise from "bluebird";
import search from "./twitter";
import { getRhymes } from "./shared";



let url = "mongodb://" + config.DB_USERNAME + ":" + config.DB_PASSWORD + "@ds157248.mlab.com:57248/" + config.DB_NAME;

function execute(batch, callback) {
	batch.execute(function(err, result) {
		if(!err) {
			console.log(result);

      var upserts = result.nUpserted;
      console.log("there were " + upserts + " upserts.");

		} else {
			console.log(err);
		}
    callback(result);
  });
}

function insertWords(db, callback) {
	let collection = db.collection('words');
	let batch = collection.initializeUnorderedBulkOp();

	const sounds = Object.keys(rhymes);

	for (let sound of sounds) {

		for (let word of rhymes[sound]["all"]) {

			batch.find({
				"word": word
			}).upsert()
				.updateOne({
					"$set": {
						"sound": sound,
						"tweets": []
					}
				});

			console.log(sound);

		}
	}

	execute(batch, callback);
}

function instertRhymes(db, callback) {
	let collection = db.collection('rhymes');
	let batch = collection.initializeUnorderedBulkOp();

	const sounds = Object.keys(rhymes);

	for (var i = 0; i < sounds.length; i++) {
		let sound = sounds[i];

		batch.find({
			"rhyme": sound
		}).upsert()
			.updateOne({
				$set: {
					"shakespeare": rhymes[sound]["shakespeare"], 
					"all": rhymes[sound]["all"]
				}
			});
	}
	execute(batch, () => {
		db.close();
	});
}

function mongoInsert(insertFunction) {
	MongoClient.connect(url, function(err, db) {
		if (!err) {
			console.log("Connected correctly to server");
			insertFunction(db, () => {
				db.close();
			});
		} else {
			console.log(err);
		}
	});
}



function seedRhymes() {
	mongoInsert(insertRhymes);
}
function seedWords() {
	mongoInsert(insertWords);
}



function updateTweetList(word, batch) {

	return search(word["word"]).then((tweets) => {

		let currentTweets = word["tweets"];
		let newTweets = getUnique(tweets.concat(word["tweets"]));

		tweetsAdded += (newTweets.length - currentTweets.length);

		batch.find({word: word["word"]})
			.upsert()
			.updateOne({
				"$set": {
					"tweets": getUnique(tweets.concat(word["tweets"]))
				}
			});
	}).catch((err) => {
		console.log("catching at line 145");
		reject(err);
	});
				
}


function seedTweets() {
	let tweetsAdded = 0;
	MongoClient.connect(url, function(err, db) {
		if (!err) {
			console.log("connected to server");
			findWords(db, (words) => {

				let batch = db.collection('words').initializeUnorderedBulkOp();

				function updateThisTweetList(word) {
					return updateTweetList(word, batch);
				}

				return Promise.map(words, updateThisTweetList)
					.then(() => {
	
						execute(batch, () => {
							console.log(tweetsAdded + " tweets added.");
							db.close();

							seedTweets();

						});

					}).catch((err) => {

						console.log("catching at line 151");
						// console.log(err);
						db.close();

						setTimeout(seedTweets, 910000);

					});

			})
		} else {
			console.log("catching at line 158");
			console.log(err);
			db.close();
		}
	});
}

function findWords(db, callback) {
  // Get the documents collection
  var collection = db.collection('words');
  // Find some documents
  collection.find({'tweets.1': {$exists: false}}).limit(20).toArray(function(err, words) {
    console.log("Found the following records");
    // console.dir(words);
    callback(words);
  });

}




seedTweets();