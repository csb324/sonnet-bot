export function pick(array) {
  let randomIndex = Math.floor( Math.random() * array.length );

  randomIndex = Math.min(randomIndex, array.length - 1);

  return array[randomIndex];
};

export function lastWord(line) {

	let words = line.split(" ");
	let lastWord = words[words.length - 1];
    
  let lastFoundWord = lastWord.toLowerCase().match(/\w+/);

  if (lastFoundWord) {
  	return lastFoundWord[0];
  } else {
  	return "";
  }

}

export function isUnique(array) {
	return ([ ...new Set(array) ].length == array.length);
}
