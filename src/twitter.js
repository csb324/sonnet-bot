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


const TWEETS_TO_RETURN = 1000;

function searchDummy(term) {
  let coinFlip = Math.floor(Math.random() * 2);
  if (coinFlip) {
    return ("tweet beginning with: " + term);
  } else {
    return false;
  }
}




export function filterTweetGeneric(tweet) {
  let tooShort = tweet.length < 25;
  let tooLong = tweet.length > 90;

  if (tooShort || tooLong) {
    return false;
  }

  let hasLinks = (tweet.search(/https?:/) > -1);
  let hasMentions = (tweet.search(/@[^\s]/) > -1);

  if (hasLinks || hasMentions) {
    return false;
  }


  const blockedWords = ["nigger", "nigga", "chink", "faggot", "fags"];

  let hasBadWords = blockedWords.reduce((a, b) => {
    return (a || tweet.indexOf(b) > -1);
  }, false);

  if (hasBadWords) {
    return false;
  }

  return true;

}



function filterTweetIntermediate(tweet, term) {
  
  if(!filterTweetGeneric(tweet)) {
    return false;
  }

  let finalWord = lastWord(tweet);
  let endsWithWord = (finalWord === term);

  return endsWithWord;
}



// legit not sure if this makes any sense
// or it's a curried function
// #paulinejacobsonlives
function filterTweetWithTerm(term) {
  let filter = function(tweet) {
    return filterTweetIntermediate(tweet, term);
  }
  return filter;
}



function searchOld(term) {

  return new Promise(function(resolve, reject) {

    T.get('search/tweets', { q: term, count: TWEETS_TO_RETURN, result_type: 'recent', lang: 'en' }, function(err, reply) {
      if (err) {
        console.log('search error:', err["message"]);
        console.log("and the term was: ", term);
        reject(err);
        return err;
      };

      let tweets = reply.statuses.map((el) => {
        return el.text.replace("\n", " -- ");
      }).filter(filterTweetWithTerm(term));

      resolve(tweets);
    });  
  });

}


export function search(term) {

  return new Promise(function(resolve, reject) {

    T.get('search/tweets', { q: term, count: TWEETS_TO_RETURN, result_type: 'recent', lang: 'en' }, function(err, reply) {
      if (err) {
        console.log('search error:', err["message"]);
        console.log("and the term was: ", term);
        reject(err);
        return err;
      };

      let tweets = reply.statuses.map((el) => {
        return el.text.replace("\n", " -- ");
      }).filter(filterTweetGeneric);

      resolve(tweets);
    });  
  });

}


export function tweetStream() {

  return T.stream('statuses/sample', {language: 'en'});

}

export function tweetStreamSearch(term) {
  return T.stream('statuses/filter', {track: term, language: 'en'});
}

// tweetStream().then((tweets) => {
//   console.log(tweets);
// });


// export default search;