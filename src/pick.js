export default function pick(array) {
  let randomIndex = Math.floor( Math.random() * array.length );

  randomIndex = Math.min(randomIndex, array.length - 1);

  return array[randomIndex];
};