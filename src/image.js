import fs from "fs";
import path from "path";
import gm from "gm";
const imageMagick = gm.subClass({ imageMagick: true });

import { pick } from "./shared";
import he from 'he';



const fontHeight = 48;
const margin = 3 * fontHeight;
const lineHeight = 1.5;
const heightBetweenStanzas = 1;


const bgColors = [
	"#FFFFF3",
	"#F3FFFF",
	"#F2F9FF",
	"#FFF9E3",
	"#FAF0E6",
	"#FFF5EE"
];


function getStanzaOffset(lineNumber) {
	if (lineNumber < 12) {
		return 0;
	}
	return 1;
}

function getMargin(lineNumber) {
	if (lineNumber > 11) {
		return margin * 1.5;
	} else {
		return margin;
	}

}


function getOffset(lineNumber) {
	let offset = margin + fontHeight;

	offset += lineNumber * fontHeight * lineHeight;
	offset += getStanzaOffset(lineNumber) * heightBetweenStanzas * fontHeight;

	return offset;
}


export default function createImage(lines, isTesting) {

	lines = lines.map((line) => {
		line = line.replace("\n", " -- ");
		return he.decode(line);
	});

	let imageWidth = 50 * fontHeight;
	let imageHeight = (getOffset(lines.length) + margin);

	return new Promise((resolve, reject) => {

		let image = gm(path.join(__dirname, "..", "assets", "paper-big.jpg"))
			.font('Bookman-Light', fontHeight);


		for (var i = 0; i < lines.length; i++) {
			image.drawText(getMargin(i), getOffset(i), lines[i]);
		}

		image.setFormat('png');


		if (isTesting) {
			image.write(path.join(__dirname, "..", "imageTemp", "test.png"), function(err) {
				if (err) {
					reject(err)
				};
				resolve();
				console.log("done!");				
			})

		} else {

			image.resize((imageWidth / 3));

			image.toBuffer(function (err, buffer) {
			  if (err) reject(err);
			  resolve(buffer.toString('base64'));
			});			

		}

	})

};
