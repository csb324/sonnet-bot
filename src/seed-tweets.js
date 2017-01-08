import Promise from "bluebird";
import { rhymes } from "./rhymes";
import { filterTweetGeneric, tweetStreamSearch } from "./twitter";
import { pick, getUnique, lastWord } from "./shared";
import { getWords, mongoInsert, execute, addTweet, getWordsWithOneTweet } from "./db";

// for when you are starting at the very beginning

// db.tweets.distinct("word").length

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
						"sound": sound
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

export function seedRhymes() {
	mongoInsert(insertRhymes);
}
export function seedWords() {
	mongoInsert(insertWords);
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



function streamTweets(wordList, filteredWordList) {

	if (!filteredWordList) {
		filteredWordList = wordList;
	}

	// Search for a random sample of 16 words on the list
	let randomIndex = Math.min(
		Math.floor(
			Math.random() * filteredWordList.length 
		), 
		filteredWordList.length - 1
	);
	let stream = tweetStreamSearch(filteredWordList.slice(randomIndex - 8, randomIndex + 8).join(","));



	let tweetsAdded = 0;

  stream.on('tweet', (tweet) => {

    if (filterTweetGeneric(tweet.text)) {
      let last = lastWord(tweet.text);

      if (wordList.indexOf(last) > -1) {
      	stream.stop();

      	console.log(" ");
      	console.log(tweet.text);

      	addTweet(last, tweet.text).then(() => {
	      	tweetsAdded += 1;
      		console.log(tweetsAdded);
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



let allWords = [];
let unmatchedWords = [];

getWords().then((words) => {
	allWords = words.map((word) => {
		return word.word;
	});
}).then(getWordsWithOneTweet).then((tweetedWords) => {

	unmatchedWords = allWords.filter(function(word) {
		if (tweetedWords.indexOf(word) == -1) {
			return true;
		}
	});

}).then(() => {

	console.log(allWords.length);
	console.log(unmatchedWords.length);

	streamTweets(unmatchedWords, unmatchedWords).then((tweets) => {
		console.log("-------- DONE --------");
		console.log(tweets);
	});
});

