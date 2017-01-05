import fs from "fs";
import path from "path";


// homegrown rhyming dictionary
//=====================
// help from:
// http://www.enchantedlearning.com/rhymes/wordfamilies/
//
// build with ```npm run build```

const rhymejson = fs.readFileSync(path.join(__dirname, "..","mega-rhymes.json")).toString();
export const rhymes = JSON.parse(rhymejson);



// a whole bunch of shakespeare lines
//=====================
// source: 
// http://www.shakespeares-sonnets.com/all.php

const shakespearejson = fs.readFileSync(path.join(__dirname, "..","shakespeare-lines.json")).toString();
export const shakespeareLines = JSON.parse(shakespearejson);
