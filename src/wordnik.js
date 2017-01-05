import { WORDNIK_KEY } from "./config"; 
import http from "http";

// for getting word info from wordnik
export function getPopularity(word) {

	word = word.toLowerCase();

	return new Promise((resolve, reject) => {
		let requestURL = "http://api.wordnik.com:80/v4/words.json/" 
			+ "search/"
			+ word 
			+ "?caseSensitive=false&minCorpusCount=5&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=1&maxLength=-1&skip=0&limit=10"
			+ "&api_key="
			+ WORDNIK_KEY;

		let req = http.request(requestURL, (res) => {
					
		  res.setEncoding('utf8');
		  let rawData = '';
		  res.on('data', (chunk) => rawData += chunk);		  
		  res.on('end', () => {
		    try {
		      let parsedData = JSON.parse(rawData);

		      if (parsedData.totalResults > 0) {
	
			      let matchingWords = parsedData.searchResults.filter((result) => {
			      	return (result.word.toLowerCase() === word);
			      });

			      let matchingWord = matchingWords[0];

			      resolve(matchingWord.count);

		      } else {

		      	resolve(0);

		      }


		    } catch (e) {
		      console.log(e.message);
		      reject(e);
		    }
		  });


		});

		req.on("error", (e) => {
			console.log("error: ");
			console.log(e.message);
			reject(e);
		})
		req.end();

	});

}