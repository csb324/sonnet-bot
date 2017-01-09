import Promise from "bluebird";
import { rhymes, shakespeareLines } from "./rhymes";
import { filterTweetGeneric, tweetStreamSearch, search } from "./twitter";
import { pick, getUnique, lastWord } from "./shared";
import { getWords, mongoInsert, execute, addTweet, getWordsWithOneTweet } from "./db";

// ----- how to connect to mongo shell -----
// mongo ds157248.mlab.com:57248/tweets_that_rhyme -u <username> -p <password>

// ----- useful mongo shell commands ------
// db.tweets.distinct("word").length
// db.words.count()
// db.tweets.distinct("sound").length
// db.rhymes.count()

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
function seedRhymes() {
	mongoInsert(insertRhymes);
}
function seedWords() {
	mongoInsert(insertWords);
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


function getRandomSubset(wordList, offset) {
	if (offset === undefined) {
		offset = 20; 
	}

	let randomIndex = Math.min(
		Math.floor(
			Math.random() * wordList.length 
		), 
		wordList.length - 1
	);

	return wordList.slice(randomIndex - offset, randomIndex + offset);

}

function streamTweets(wordList) {
	let queriedWords = getRandomSubset(wordList);
	console.log(queriedWords);

	let stream = tweetStreamSearch(queriedWords.join(","));
	let tweetsAdded = 0;

  stream.on('tweet', (tweet) => {

    if (filterTweetGeneric(tweet.text)) {
      let last = lastWord(tweet.text);

      if (wordList.indexOf(last) > -1) {
      	stream.stop();

      	addTweet(last, tweet.text).then(() => {
	      	tweetsAdded += 1;
	      	console.log(" ");
      		console.log(tweetsAdded + ": " + tweet.text);
      		stream.start();
      	});

      } else {
      	process.stdout.write("-") 
      }
    } else {
    	process.stdout.write(".") 
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


function getWordsArray() {
	return getWords().then((words) => {

		return words.map((word) => {
			return word.word;
		});

	})
}


function getUnmatchedWordsArray() {
	let allWords = [];

	return getWordsArray().then((result) => {
		allWords = result;
	}).then(getWordsWithOneTweet).then((tweetedWords) => {

		return allWords.filter(function(word) {
			if (tweetedWords.indexOf(word) == -1) {
				return true;
			}
		});
	});

}

function streamForUnmatched() {

	getUnmatchedWordsArray().then((unmatchedWords) => {

		console.log(unmatchedWords.length);

		streamTweets(unmatchedWords).then(() => {
			console.log("-------- DONE --------");
		}).catch((err) => {
			console.log(err);
		});
	});
}


function stream() {

	getWordsArray().then((allWords) => {
		console.log(allWords.length);

		streamTweets(allWords).then(() => {
			console.log("-------- DONE --------");
		}).catch((err) => {
			console.log(err);
		});
	});

}




function searchTweets(isFiltered) {

	let wordList;
	let wordListPromise;
	let tweetsAdded = 0;

	if (!isFiltered) {
		wordListPromise = getWordsArray();
	} else {
		wordListPromise = getUnmatchedWordsArray();
	}

	wordListPromise.then((allWords) => {

		wordList = allWords;
		let queriedWords = getRandomSubset(allWords, 10);
		return search(queriedWords.join(" OR "));

	}).then((results) => {

		return Promise.map(results, (tweet) => {
			let last = lastWord(tweet);
      if (wordList.indexOf(last) > -1) {

      	return addTweet(last, tweet).then(() => {
	      	tweetsAdded += 1;
      		console.log(tweetsAdded + ": " + tweet);
	      	console.log(" ");
      	});
      } else {
      	return;
      }
 		});
	});
}

// streamForUnmatched();
searchTweets();
