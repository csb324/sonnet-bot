import Promise from "bluebird";
import { pick, pickAndRemove, lastWord, isUnique } from "./shared";
import { getSounds, getWords, getTweets, getRandomTweet, getSound } from "./db";
import searchTweets from "./seed-tweets";
import { postTweet } from "./twitter";
import createImage from "./image";


let lines;

function createSonnet() {

	lines = [];
	let sounds = [];
	let firstLine;

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

		firstLine = result[0];
		return createImage(result);

	}).then((base64) => {
		return postTweet(firstLine, base64);
	}).then(() => {
		process.exit();


	}).catch((err) => {
		console.log("problem!");
		console.log(err);
	});

}


function getLine(rhyme) {
	let lastWords = lines.map(lastWord);
	let diceRoll = Math.random();

	let shakespeare = false;

	if (diceRoll < 0.25) {
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


// createImage([
// 	"Bookman-Demi", 
// 	"Courier", 
// 	"Helvetica", 
// 	"Helvetica-Narrow \n And more stuff", 
	
// 	"Palatino-Roman", 
// 	"URWAntiquaT-RegularCondensed",
// 	"Hershey-Plain-Duplex",
// 	"Hershey-Gothic-English",

// 	"Utopia-Regular",
// 	"Charter-Roman",
// 	"NewCenturySchlbk-Roman",
// 	"Bookman-Light",

// 	"Helvetica-Bold",
// 	"Helvetica-Bold"
// 	])
