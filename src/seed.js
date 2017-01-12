import searchTweets, { getWordList } from "./seed-tweets";

const CUTOFF = 10;

export default function seed(targetTweets) {

	let imported = 0;
	let wordList = [];

	function searchRound(tweetsThisRound) {

		return new Promise((resolve, reject) => {

			imported += tweetsThisRound;

			if (imported < targetTweets) {

				setTimeout(() => {
					resolve(searchTweets(wordList).then(searchRound));
				}, 1000);

			} else {

				resolve(imported);
				return;

			}

		});

	}

	return getWordList(CUTOFF).then((words) => {

		wordList = words;

		return searchRound(0)

	});

}

