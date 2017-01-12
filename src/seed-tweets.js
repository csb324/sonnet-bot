import Promise from "bluebird";
import { filterTweetGeneric, tweetStreamSearch, search } from "./twitter";
import { pick, getUnique, lastWord, getRandomSubset } from "./shared";
import { getWords, execute, addTweet, getWordsWithOneTweet, getWordsWithLessThanNTweets } from "./db";

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


function getFilteredWordsArray(cutoff) {

	let words = [];
	return getUnmatchedWordsArray().then((unmatchedWords) => {
		words = words.concat(unmatchedWords);

		return getWordsWithLessThanNTweets(cutoff)
	}).then((filteredWords) => {
		words = words.concat(filteredWords);
		return words;
	})
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


export function getWordList(maxTweets) {
	let wordListPromise;
	if (!maxTweets || maxTweets == 0) {
		wordListPromise = getWordsArray();
	} else {
		wordListPromise = getFilteredWordsArray(maxTweets);
	}
	return wordListPromise;
}

function searchTweets(wordList) {

	let tweetsAdded = 0;
	let queriedWords = getRandomSubset(wordList, 10);

	return search(queriedWords.join(" OR ")).then((results) => {

		if (results.length == 0) {
			return 0;
		} else {

			return Promise.map(results, (tweet) => {
				let last = lastWord(tweet);
	      if (wordList.indexOf(last) > -1) {

	      	return addTweet(last, tweet).then(() => {
		      	tweetsAdded += 1;
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