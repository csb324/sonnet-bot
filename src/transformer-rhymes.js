import fs from "fs";
import path from "path";
import rita from "rita";

import {getWordsToLines} from "./transformer-lines";

getWordsToLines();

const lex = rita.RiLexicon();

const rhymejson = fs.readFileSync(path.join(__dirname, "..","shakespeare-rhymes.json")).toString();

const rhymeObject = JSON.parse(rhymejson);



function getRhymes() {
	let rhymes = {};

	for (let sound in rhymeObject) {
		rhymes[sound] = {};
		rhymes[sound]["shakespeare"] = rhymeObject[sound];

		let otherWords = [];

		for (var i = 0; i < rhymeObject[sound].length; i++) {

			let word = rhymeObject[sound][i];
			otherWords = otherWords.concat(lex.rhymes(word));

		}

		let allWords = otherWords.concat(rhymeObject[sound]).filter((word) => {
			return word.length > 2;
		});

		rhymes[sound]["all"] = [ ...new Set(allWords) ];

	}

	return rhymes;
}

fs.writeFile(path.join(__dirname, "..", "all-rhymes.json"), JSON.stringify(getRhymes()));
