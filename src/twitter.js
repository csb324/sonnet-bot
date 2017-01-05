import Twit from "twit";
import { pick, lastWord } from "./shared";

let T;

if (process.env.NODE_ENV == "production") {
  T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });
} else {
  let credentials = require("./config.js");

  T = new Twit({
    consumer_key:         credentials.CONSUMER_KEY,
    consumer_secret:      credentials.CONSUMER_SECRET,
    access_token:         credentials.ACCESS_TOKEN,
    access_token_secret:  credentials.ACCESS_TOKEN_SECRET
  });
};


const TWEETS_TO_RETURN = 500;

function searchDummy(term) {
  let coinFlip = Math.floor(Math.random() * 2);
  if (coinFlip) {
    return ("tweet beginning with: " + term);
  } else {
    return false;
  }
}

function search(term) {

  return new Promise(function(resolve, reject) {

    T.get('search/tweets', { q: term, count: TWEETS_TO_RETURN, result_type: 'recent', lang: 'en' }, function(err, reply) {
      if (err) {
        console.log('search error:',err);
        console.log("and the term was: ", term);
        reject(err);
        return;
      };

      let tweets = reply.statuses.map((el) => {
        return el.text.replace("\n", " -- ");
      }).filter((el) => {

        let tooShort = el.length < 25;
        let tooLong = el.length > 90;

        if (tooShort || tooLong) {
          return false;
        }

        let hasLinks = (el.search(/https?:/) > -1);
        let hasMentions = (el.search(/@[^\s]/) > -1);

        if (hasLinks || hasMentions) {
          return false;
        }

        let finalWord = lastWord(el);
        let endsWithWord = (finalWord === term);

        return endsWithWord;
      });

      if (tweets.length > 0) {
        resolve(pick(tweets));
      } else {
        resolve(false);
      }
    });  
  });
}



export default search;