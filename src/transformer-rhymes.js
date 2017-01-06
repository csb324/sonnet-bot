import fs from "fs";
import path from "path";
import rita from "rita";
import nodeRhyme from "rhyme";
import Promise from "bluebird";

import { getWordsToLines } from "./transformer-lines";
import { getPopularity } from "./wordnik";


getWordsToLines();

const lex = rita.RiLexicon();

const rhymejson = fs.readFileSync(path.join(__dirname, "..","shakespeare-rhymes.json")).toString();
const shakespeareRhymes = JSON.parse(rhymejson);



const POPULARITY_CUTOFF = 100000;

function getAdvancedRhymes(word) {

	return new Promise(function(resolve, reject) {

		nodeRhyme(function(r) {
			let advancedRhymes = r.rhyme(word);


			advancedRhymes = advancedRhymes.filter((word) => {
				let lettersOnly = word.match(/\w+/);

				if (lettersOnly[0]) {
					return (word === lettersOnly[0]);
				}
			});

			advancedRhymes.push(word);

			let rhymesPopularity = Promise.map(advancedRhymes, (word) => {

				return getPopularity(word).then((popularity) => {
					if (popularity > POPULARITY_CUTOFF) {
						// console.log(word + "\t\t\t\t" + popularity);
						return {
							word: word,
							popularity: popularity
						};

					} else {
						return false;
					}
				});

			}, {
				concurrency: 30
			});



			rhymesPopularity.then((wordObjects) => {

				let popularWords = wordObjects.filter((wordObject) => {
					// make sure the word exists
					return wordObject;
				}).sort((a, b) => {

					// sort by wordnik popularity
					if (a.popularity < b.popularity) {
						return 1;
					};
					if (a.popularity > b.popularity) {
						return -1;
					}
					return 0;

				});

				// don't have more than fifteen words per rhyme -- stick to more popular words. might update this.
				if (popularWords.length > 15) {
					popularWords = popularWords.slice(0, 15);
				}


				let words = popularWords.map((word) => {
					return word.word.toLowerCase();
				});

				resolve(words);
			});

		});

	});

};


function getRhymes() {

	let rhymes = {};

	let allSounds = Object.keys(shakespeareRhymes);


	return Promise.map(allSounds, (sound) => {

		console.log(sound);

		rhymes[sound] = {
			"shakespeare": shakespeareRhymes[sound],
			"all": []
		};

		// for (var i = 0; i < shakespeareRhymes[sound].length; i++) {
		// 	let word = shakespeareRhymes[sound][i];
		// 	let ritaRhymes = lex.rhymes(word);
		// 	console.log(ritaRhymes);
		// 	rhymes[sound]["all"] = rhymes[sound]["all"].concat(ritaRhymes);
		// }

		let advancedRhymes = getAdvancedRhymes(shakespeareRhymes[sound][0]);

		return Promise.join(sound, advancedRhymes, (sound, advancedRhymes) => {
			return {
				sound: sound,
				rhymes: advancedRhymes					
			}
		});
	}, {
		concurrency: 1
	}).then((soundObjects) => {

		for (var soundObject of soundObjects) {
			// console.log(soundObject);
			rhymes[soundObject.sound]["all"] = rhymes[soundObject.sound]["all"].concat(soundObject.rhymes).filter((word) => {
				return (word.length > 1);
			});
		}

		// return only unique
		rhymes[soundObject.sound]["all"] = [... new Set(rhymes[soundObject.sound]["all"])];

		return rhymes;

	});

}

// getAdvancedRhymes("me");

getRhymes().then((rhymes) => {


	const sounds = Object.keys(rhymes);
	let commonRhymes = {};


	// only allow common rhymes (sounds with more than five words)
	for (var sound of sounds) {
		console.log(rhymes[sound]);
		if (rhymes[sound]["all"].length > 1 && rhymes[sound]["shakespeare"].length > 1) {
			commonRhymes[sound] = rhymes[sound];
		}
	}


	console.log(Object.keys(commonRhymes).length + " rhyme sounds are valid");

	fs.writeFile(path.join(__dirname, "..", "mega-rhymes.json"), JSON.stringify(commonRhymes));

	console.log(commonRhymes["err"]["all"].length);

});