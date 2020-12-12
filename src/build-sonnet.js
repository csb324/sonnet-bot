import Promise from "bluebird";

import { lastWord } from "./shared";
import { getRandomTweet, getSound, removeTweet } from "./db";
import seed from './seed';
import { postTweet } from "./twitter";
import createImage from "./image";

let lines;
let tweetsUsed;

function buildSonnet() {

	tweetsUsed = [];
	lines = [];
	let sounds = [];
	let firstLine;

	Promise.mapSeries(Array(7).fill(), () => {
		console.log("getting sounds");
		return getSound(sounds).then((sound) => {
			console.log("got one");
			sounds.push(sound);
		})
	}).then(() => {
		console.log("setting scheme");

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

		// for each sound, create a line
		return Promise.mapSeries(rhymeScheme, (rhyme) => {
			return getLine(rhyme).then((line) => {
				lines.push(line);
				return line;
			});
		});

	}).then((result) => {

		firstLine = result[0];

		// Make sure the poem doesn't end in a comma or something
		result[13] = endPoem(result[13]);

		// build the image!
		return createImage(result);

	}).then((base64) => {
		// post the tweet!
		return postTweet(firstLine, base64);

	}).then(() => {
		// Remove tweets that were used so that this doesn't get repetitive
		return Promise.map(tweetsUsed, removeTweet);

	}).then(() => {
		// replenish the bank of tweets and you're done!
		console.log("getting more tweets");
		return seed(tweetsUsed.length);

	}).then(() => {
		console.log("done!");		

	}).catch((err) => {
		console.log("problem!");
		console.log(err);
	});
}



// given a rhyming sound, return a line of a sonnet
function getLine(rhyme) {
	// don't rhyme a word with itself!
	let lastWords = lines.map(lastWord);

	// sprinkle in some shakespeare
	let shakespeare = false;
	if (Math.random() < 0.2) {
		shakespeare = true;
	}


	return getRandomTweet({
		"sound": rhyme,
		"word": { "$nin": lastWords },
		"shakespeare": shakespeare

	}).then((tweetObject) => {
		// don't delete the shakespeare lines -- we want to keep those
		if (!tweetObject["shakespeare"]) {
			// otherwise, add the tweet to the list to delete later
			tweetsUsed.push(tweetObject._id);
		}

		return tweetObject["tweet"];
	});
}



function endPoem(lastLine) {
	// just to make sure the poem doesn't end in a , or ; 
	return lastLine.replace(/[,;]\s?$/, ".");
}



export default buildSonnet;
