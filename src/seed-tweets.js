import Promise from "bluebird";
import { shakespeareLines } from "./rhymes";
import { filterTweetGeneric, tweetStreamSearch, search } from "./twitter";
import { pick, getUnique, lastWord, getRandomSubset } from "./shared";
import { getWords, execute, addTweet, getWordsWithOneTweet } from "./db";

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


function stream(isFiltered) {
	let wordListPromise;

	if (!isFiltered) {
		wordListPromise = getWordsArray();
	} else {
		wordListPromise = getUnmatchedWordsArray();
	}

	wordListPromise.then((words) => {
		console.log(words.length);

		streamTweets(words).then(() => {
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


	return wordListPromise.then((allWords) => {

		wordList = allWords;		
		let queriedWords = getRandomSubset(allWords, 10);

		return search(queriedWords.join(" OR "));

	}).then((results) => {

		if (results.length == 0) {
			console.log("no results");
			return 0;
		} else {

			return Promise.map(results, (tweet) => {
				let last = lastWord(tweet);
	      if (wordList.indexOf(last) > -1) {

	      	return addTweet(last, tweet).then(() => {
		      	tweetsAdded += 1;
	      		console.log(tweetsAdded + ": " + tweet);
		      	console.log(" ");

		      	return tweet;
	      	});

	      } else {
	      	return false;
	      }
	 		}).then(() => {
	 			return tweetsAdded;
	 		});			

		}
	});
}

export default searchTweets;