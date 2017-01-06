import { pick, lastWord } from "./shared";
import fs from "fs";
import path from "path";

// source: 
// http://www.shakespeares-sonnets.com/all.php

export const sonnetLines = fs.readFileSync(path.join(__dirname, "..", "shakespeare.txt"))
	.toString()
	.split("\n");


// function getFinalWord(line) {
// 	let words = line.split(" ");
// 	let finalWord = words[words.length - 1];
// 	const nonletters = /\W/g;

// 	finalWord = finalWord.replace(nonletters, "").toLowerCase();
// 	return finalWord;
// }

export const finalWords = sonnetLines.map(lastWord).filter((word) => {
	return word.length > 0;
});


export function getWordsToLines() {
	let wordsToLines = {};

	for (var line of sonnetLines) {
		let finalWord = lastWord(line);

		if (finalWord.length > 0) {
			if (!wordsToLines[finalWord]) {
				wordsToLines[finalWord] = [];
			}
			wordsToLines[finalWord].push(line);
		}
	}

	console.log(Object.keys(wordsToLines).length + " words have shakespeare lines attached");

	fs.writeFile(path.join(__dirname, "..", "shakespeare-lines.json"), JSON.stringify(wordsToLines));

	return wordsToLines;

}

