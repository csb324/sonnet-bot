import Promise from "bluebird";
import { pick, pickAndRemove, lastWord, isUnique } from "./shared";
import { getSounds, getWords, getTweets, getRandomTweet } from "./db";

let lines;

function createSonnet() {

	lines = [];

	return getSounds().then((soundList) => {
		let sounds = [];
		let allSounds = soundList;

		for (var i = 0; i < 7; i++) {
			sounds.push(pickAndRemove(allSounds));
		}

		let rhymeScheme = [
			sounds[0],
			sounds[1],
			sounds[0],
			sounds[1],
			sounds[2],
			sounds[3],
			sounds[2],
			sounds[3],
			sounds[4],
			sounds[5],
			sounds[4],
			sounds[5],
			sounds[6],
			sounds[6]
		];

		return Promise.mapSeries(rhymeScheme, (rhyme) => {
			return getLine(rhyme).then((line) => {
				lines.push(line);
				return line;
			});
		});
	}).then((result) => {
		console.log(result.join("\n"));
	});
}


function getLine(rhyme) {
	let lastWords = lines.map(lastWord);
	let diceRoll = Math.random();

	let shakespeare = false;

	if (diceRoll < 0.2) {
		shakespeare = true;
	}

	return getRandomTweet({
		"sound": rhyme,
		"word": { "$nin": lastWords },
		"shakespeare": shakespeare
	}).then((tweetObject) => {
		return tweetObject["tweet"];
	});
}

createSonnet();




function getUniqueWords(rhymesList) {
	console.log("getting unique words......");

	let wordsChoices = rhymesList.map((rhyme) => {
		return rhymes[rhyme]["all"];
	})

	let wordsArray = wordsChoices.map((words) => {
		return pick(words);
	});

	if (!isUnique(wordsArray)) {
		return getUniqueWords(rhymesList);

	} else {
		return wordsArray;
	}
}



function stanza() {

	return new Promise((resolve, reject) => {

		let rhyme1 = pick(sounds);
		let rhyme2 = pick(sounds);

		let rhymesList = [rhyme1, rhyme2, rhyme1, rhyme2];

		let words = getUniqueWords(rhymesList);

		let searches = Promise.all(words.map((word) => {
			return search(word);
		}));

		searches.then(function(lines) {

			let thisStanza = [];

			for (var i = 0; i < lines.length; i++) {
				let line = lines[i]
				let word = words[i];

				if (line && thisStanza.indexOf(line) == -1) {
					thisStanza.push(line);
				} else {

					let options = rhymes[rhymesList[i]]["shakespeare"];

					let existingLastWords = thisStanza.map(lastWord);

					options = options.filter((word) => {
						return (existingLastWords.indexOf(word) == -1);
					});

					if (options.length > 0) {
						let shakespeareWord = pick(options);
						line = pick(shakespeareLines[shakespeareWord]);

						// console.log(options);
						// console.log(existingLastWords);

						shakespeareLinesCount += 1;
						thisStanza.push(line);

					} else {
						reject("there is no word available that ends in: " + word);
					}

				}
			}

			resolve(thisStanza);

		});

	})

}


function buildSonnet() {

	Promise.all([stanza(), stanza(), stanza()]).then((stanzas) => {
		let sonnet = stanzas.reduce((a, b) => {
			return a.concat(b);
		}, []);

		let lastWords = sonnet.map(lastWord);
		let wordsAreUnique = isUnique(lastWords);

		let notAllShakespeare = (shakespeareLinesCount < 10);

		if (wordsAreUnique && notAllShakespeare) {
			console.log(sonnet.join("\n"));

		} else if (!notAllShakespeare) {
			console.log("too much shakespeare.")
		} else {

			console.log("duplicate lines");
			console.log(lastWords);
		}

	})
	.catch((msg) => {
		console.log(msg);
	});

};

// buildSonnet();
