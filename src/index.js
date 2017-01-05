import search from "./twitter";
import rita from "rita";
import { rhymes, shakespeareLines } from "./rhymes";
import { pick, lastWord, isUnique } from "./shared";

import { getPopularity } from "./wordnik";


const sounds = Object.keys(rhymes);
let shakespeareLinesCount = 0;



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

		let notAllShakespeare = (shakespeareLinesCount < 7);

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

buildSonnet();
