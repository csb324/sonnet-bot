export function pick(array) {
  let randomIndex = Math.floor( Math.random() * array.length );

  randomIndex = Math.min(randomIndex, array.length - 1);

  return array[randomIndex];
};

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
