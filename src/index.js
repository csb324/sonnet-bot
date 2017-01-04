import search from "./twitter";
import rita from "rita";
import { rhymes, shakespeareLines } from "./rhymes";
import pick from "./pick";


let sonnet = [];

const sounds = Object.keys(rhymes);

let rhyme1 = pick(sounds);
let rhyme2 = pick(sounds);



function stanza(rhyme1, rhyme2) {

	console.log(rhyme1 + ", " + rhyme2);

	let rhymesList = [rhyme1, rhyme2, rhyme1, rhyme2];

	let words = [pick(rhymes[rhyme1]["all"]), pick(rhymes[rhyme2]["all"]), pick(rhymes[rhyme1]["all"]), pick(rhymes[rhyme2]["all"])];


	let searches = Promise.all(words.map((word) => {
		return search(word);
	}));



	searches.then(function(lines) {

		for (var i = 0; i < lines.length; i++) {
			let line = lines[i]
			let word = words[i];


			if (line) {
				sonnet.push(line);
			} else {

				let options = rhymes[rhymesList[i]]["shakespeare"];
				let shakespeareWord = pick(options);
				
				line = pick(shakespeareLines[shakespeareWord]);


				sonnet.push(line);
			}
		}

		console.log(sonnet);

	});

}

stanza(rhyme1, rhyme2);


// console.log(Object.keys(shakespeare));
