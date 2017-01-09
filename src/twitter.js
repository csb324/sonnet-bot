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

export function search(term) {

  return new Promise(function(resolve, reject) {

    T.get('search/tweets', { q: term, count: TWEETS_TO_RETURN, result_type: 'recent', lang: 'en' }, function(err, reply) {

      if (err) {
        console.log('search error:', err["message"]);
        console.log("and the term was: ", term);
        reject(err);
        return err;
      };


      if (reply.statuses.length == 0) {
        console.log("nothing to see here.");
        resolve([]);
      } else {

        let tweets = reply.statuses.map((el) => {
          return el.text.replace("\n", " -- ");
        }).filter(filterTweetGeneric);

        resolve(tweets);        
      }

    });  
  });
}

export function tweetStream() {
  return T.stream('statuses/sample', {language: 'en'});

}

export function tweetStreamSearch(term) {
  return T.stream('statuses/filter', {track: term, language: 'en'});
}

export function postTweet(text, imageData) {

  return new Promise((resolve, reject) => {
    // first we must post the media to Twitter
    T.post('media/upload', { media_data: imageData }, function (err, data, response) {

      if (err) {
        reject(err);
      }

      // now we can assign alt text to the media, for use by screen readers and
      // other text-based presentations and interpreters
      let mediaIdStr = data.media_id_string;
      let altText = text;
      let meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

      T.post('media/metadata/create', meta_params, function (err, data, response) {
        if (!err) {
          // now we can reference the media and post a tweet (media will attach to the tweet)
          var params = { status: text, media_ids: [mediaIdStr] }

          T.post('statuses/update', params, function (err, data, response) {
            if (err) {
              reject(err);
            }

            console.log(data)
            resolve(data);
          })
        } else {
          reject(err);
        }
      })
    })
  });

}