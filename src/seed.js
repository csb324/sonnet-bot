import searchTweets from "./seed-tweets";


let imported = 0;

function keepSearching(tweetsThisRound) {

	imported += tweetsThisRound;

	if (imported < 50) {
		console.log(imported);

		setTimeout(() => {
			return searchTweets().then(keepSearching);			
		}, 1000);

	} else {
		console.log("imported " + imported + " tweets");
		process.exit();
	}

}

keepSearching(0);