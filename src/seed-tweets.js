import Mongo, { MongoClient } from "mongodb";
import config from "./config";
import { rhymes } from "./rhymes";
import Promise from "bluebird";
import { tweetStream, filterTweetGeneric, tweetStreamSearch } from "./twitter";
import { pick, getUnique, lastWord } from "./shared";



let url = "mongodb://" + config.DB_USERNAME + ":" + config.DB_PASSWORD + "@ds157248.mlab.com:57248/" + config.DB_NAME;

let allWords = [];


function execute(batch, callback) {
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

function mongoInsert(insertFunction, options) {
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

function seedRhymes() {
	mongoInsert(insertRhymes);
}
function seedWords() {
	mongoInsert(insertWords);
}


function addTweetsFromWord(db, callback, options) {

	let wordObject = options.wordObject;

	let tweets = wordObject["tweets"];
	let collection = db.collection('tweets');

	let batch = collection.initializeUnorderedBulkOp();

	for (let tweet of tweets) {
		batch.insert({
			tweet: tweet,
			word: wordObject["word"],
			sound: wordObject["sound"]
		});
	};

	execute(batch, callback);
}

function convertWordsToTweets() {

	getWordList().then((wordArray) => {

		Promise.map(wordArray, (wordObject) => {

			if (wordObject["tweets"].length > 0) {
				return mongoInsert(addTweetsFromWord, {wordObject: wordObject});
			} else {
				return true;
			}
		}).then(() => {
			console.log("hell yeah");
		});

	});

}

function getWordList() {
	return new Promise((resolve, reject) => {
		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				reject(err);
				return;
			}

			db.collection('words').find({}).toArray(function(err, words) {

				db.close();

				if (err) {
					reject(err);
				}

				resolve(words);
			});

		});
	})
};



function addTweet(word, tweet) {

	return new Promise((resolve, reject) => {

		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				return;
			}


			db.collection('words').findOne({
				word: word
			}).then((existingWord) => {

				// let currentTweets = existingWord["tweets"];
				// currentTweets.push(tweet)
				// let newTweets = getUnique(currentTweets);

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

function addTweetToWord(word, tweet) {

	return new Promise((resolve, reject) => {

		MongoClient.connect(url, (err, db) => {
			if (err) {
				console.log(err);
				return;
			}

			db.collection('words').findOne({
				word: word
			}).then((existingWord) => {

				let currentTweets = existingWord["tweets"];
				currentTweets.push(tweet)
				let newTweets = getUnique(currentTweets);

				return db.collection('words').findOneAndUpdate({
						_id: existingWord._id
					}, {
						"$set": {
							"tweets": newTweets
						}
					}
				);

			}).then(() => {

				db.close();

				resolve();

			}).catch((err) => {
				console.log("error");
				db.close();

				reject(err);

			});
		});
	})
}

function streamTweets() {

	// nudge it in the right direction a little bit
	let targetWord = pick(allWords);
	console.log(targetWord);


	let stream = tweetStreamSearch(targetWord);
	let tweetsAdded = [];


  stream.on('tweet', (tweet) => {
    if (filterTweetGeneric(tweet.text)) {
      // console.log(tweet.text);
      let last = lastWord(tweet.text);

      if (allWords.indexOf(last) > -1) {
      	stream.stop();

      	console.log(tweet.text);

      	tweetsAdded.push(tweet.text);
      	addTweet(last, tweet.text).then(() => {
      		console.log(tweetsAdded.length);
      		stream.start();
      	});

      }
    } 
  });

  return new Promise(function(resolve, reject) {
  	// error out if it's time to error out.
  	stream.on('error', (err) => {
  		reject(err);
  	});
  	stream.on('disconnect', (err) => {
  		reject(err);
  	});
  	stream.on('limit', (err) => {
  		reject(err);
  	});


    return setTimeout(function() {
      stream.stop();
      resolve(tweetsAdded);
    }, 600000);
  });
}



function clearTweets() {
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



getWordList().then((words) => {
		allWords = words.map((word) => {
			return word.word;
		});

		return allWords;
}).then((list) => {
	streamTweets().then((tweets) => {
		console.log("-------- DONE --------");
		console.log(tweets.length);
	})
});

