import Twit from "twit";
import pick from "./pick";

let T;

if (process.env.NODE_ENV == "production") {
  T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });
} else {
  T = new Twit(require('./config.js'));
};

const TWEETS_TO_RETURN = 500;

function search(term) {
  console.log("searching....");

  return new Promise(function(resolve, reject) {

    T.get('search/tweets', { q: term, count: TWEETS_TO_RETURN, result_type: 'recent', lang: 'en' }, function(err, reply) {
      if (err) {
        console.log('search error:',err);
        console.log("and the term was: ", term);
        reject(err);
        return;
      };

      let tweets = reply.statuses.map((el) => {
        return el.text;
      }).filter((el) => {

        let endsWithWord = false;
        let words = el.split(" ");
        if (words[words.length - 1].indexOf(term) > -1) {
          endsWithWord = true;
        }
        let multiWord = (words.length > 2);

        let noLinks = (el.search(/https?:/) == -1);
        let noMentions = (el.search(/@[^\s]/) == -1);

        return endsWithWord && noLinks && noMentions && multiWord;

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