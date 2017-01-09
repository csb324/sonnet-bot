export function pick(array) {
  let randomIndex = Math.floor( Math.random() * array.length );

  randomIndex = Math.min(randomIndex, array.length - 1);

  return array[randomIndex];
};

export function pickAndRemove(array) {
  let randomIndex = Math.floor( Math.random() * array.length );
  randomIndex = Math.min(randomIndex, array.length - 1);

  return array.splice(randomIndex, 1)[0];
}


export function lastWord(line) {

	let words = line.split(" ");
	let lastWord = words[words.length - 1];
    
  const nonletters = /\W/g;

  lastWord = lastWord.replace(nonletters, "").toLowerCase();
  return lastWord;

}

export function getUnique(array) {
  return [... new Set(array)];
}

export function isUnique(array) {
	return (getUnique(array).length == array.length);
}


export function getRandomSubset(wordList, offset) {
  if (offset === undefined) {
    offset = 20; 
  }

  let randomIndex = Math.min(
    Math.floor(
      Math.random() * wordList.length 
    ), 
    wordList.length - 1
  );

  let randomStart = Math.max(randomIndex - offset, 0);
  let randomEnd = Math.min(randomIndex + offset, wordList.length)

  return wordList.slice(randomStart, randomEnd);
}
