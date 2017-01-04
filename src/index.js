import search from "./twitter";
import rita from "rita";
import { rhymes, shakespeareLines } from "./rhymes";
import pick from "./pick";


let sonnet = [];

const sounds = Object.keys(rhymes);





function stanza() {

	return new Promise((resolve, reject) => {

		let rhyme1 = pick(sounds);
		let rhyme2 = pick(sounds);


		let rhymesList = [rhyme1, rhyme2, rhyme1, rhyme2];

		let words = rhymesList.map((rhyme) => {
			return pick(rhymes[rhyme]["all"]);
		});

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

			resolve();

		});

	})


}

stanza().then(() => {
	stanza().then(() => {
		stanza().then(() => {
			console.log(sonnet.join("\n"));
		})
	})
});



// console.log(Object.keys(shakespeare));
