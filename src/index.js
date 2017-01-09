import Promise from "bluebird";
import { pick, pickAndRemove, lastWord, isUnique } from "./shared";
import { getSounds, getWords, getTweets, getRandomTweet, getSound } from "./db";
import searchTweets from "./seed-tweets";


let lines;

function createSonnet() {

	lines = [];
	let sounds = [];

	searchTweets(false).then(() => {

		return Promise.mapSeries(Array(7).fill(), () => {
			return getSound(sounds).then((sound) => {
				sounds.push(sound);
			})
		});

	}).then(() => {

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

		process.exit();
	});
}


function getLine(rhyme) {
	let lastWords = lines.map(lastWord);
	let diceRoll = Math.random();

	let shakespeare = false;

	if (diceRoll < 0.3) {
		shakespeare = true;
	}

	return getRandomTweet({
		"sound": rhyme,
		"word": { "$nin": lastWords },
		"shakespeare": shakespeare
	}).then((tweetObject) => {

		console.log(tweetObject);

		return tweetObject["tweet"];
	});
}

createSonnet();
