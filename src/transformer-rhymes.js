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

const shakespeareRhymeObject = JSON.parse(rhymejson);




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

			let rhymesPopularity = Promise.map(advancedRhymes, (word) => {

				return getPopularity(word).then((popularity) => {
					if (popularity > 150000) {
						// console.log(word + "\t\t\t\t" + popularity);
						return word;
					} else {
						return false;
					}
				});

			}, {
				concurrency: 30
			});

			rhymesPopularity.then((words) => {

				let uniqueWords = words.filter((word) => {
					return word;
				}).map((word) => {
					return word.toLowerCase();
				});

				resolve(uniqueWords);
			});

		});

	});

};


function getRhymes() {

	let rhymes = {};

	let allSounds = Object.keys(shakespeareRhymeObject);


	return Promise.map(allSounds, (sound) => {

		console.log(sound);
		rhymes[sound] = {
			"shakespeare": shakespeareRhymeObject[sound],
			"all": []
		};

		for (var i = 0; i < shakespeareRhymeObject[sound].length; i++) {
			let word = shakespeareRhymeObject[sound][i];
			let ritaRhymes = lex.rhymes(word);
			rhymes[sound]["all"] = rhymes[sound]["all"].concat(ritaRhymes);
		}

		let advancedRhymes = getAdvancedRhymes(shakespeareRhymeObject[sound][0]);

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

		return rhymes;

	});

}

// getAdvancedRhymes("me");

getRhymes().then((rhymes) => {


	const sounds = Object.keys(rhymes);
	let commonRhymes = {};


	// only allow common rhymes (sounds with more than five words)
	for (var sound of sounds) {
		if (rhymes[sound]["all"].length > 5) {
			commonRhymes[sound] = rhymes[sound];
		}
	}

	fs.writeFile(path.join(__dirname, "..", "mega-rhymes.json"), JSON.stringify(commonRhymes));
});
