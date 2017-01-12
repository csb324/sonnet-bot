import Promise from "bluebird";
import { getWords, execute, addTweet, getWordsWithOneTweet, mongoInsert } from "./db";
import { rhymes, shakespeareLines } from "./rhymes";

// for when you are starting at the very beginning
function insertWords(db, callback) {
	let collection = db.collection('words');
	let batch = collection.initializeUnorderedBulkOp();

	let rhymes = db.collection('rhymes').find({}).toArray((err, docs) => {
		docs.map((rhymeObject) => {

			console.log(rhymeObject);

			let allWords = rhymeObject["shakespeare"].concat(rhymeObject["all"]);

			for (let word of allWords) {
				batch.find({
					"word": word
				}).upsert()
					.updateOne({
						"$set": {
							"sound": rhymeObject["rhyme"]
						}
					});
			}
		});

		execute(batch, callback);
	});
}


function addShakespeare(db, callback) {
	let collection = db.collection('tweets');
	let batch = collection.initializeUnorderedBulkOp();

	return Promise.map(Object.keys(shakespeareLines), (word) => {
		return db.collection('words').findOne({
			"word": word
		}).then((existingWord) => {

			return Promise.map(shakespeareLines[word], (line) => {

				if (!existingWord) {
					console.log("word doesn't exist: " + word );
					batch.find({
						"tweet": line
					}).remove();
				} else {
					batch.find({
						"tweet": line
					}).upsert()
						.updateOne({
							"$set": {
								"word": word,
								"shakespeare": true,
								"sound": existingWord["sound"]
							}
						});
				}

				return;

			});
		});

	}).then(() => {
		execute(batch, callback);
	})
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


// for when you have words with lists of tweets in an array, 
// but instead you want each tweet to be a document of its own
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
	getWords().then((wordArray) => {
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



function seedRhymes() {
	mongoInsert(insertRhymes);
}
function seedWords() {
	mongoInsert(insertWords);
}
