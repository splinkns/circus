'ure strict';

// Use `npm run fontgen` to invoke this script.

// The generated LESS and WOFF are meant to be commited to the
// repository, because the generated WOFF is small enough and
// will not change frequently.

// const webfontsGenerator = require('webfonts-generator');
const svgicons2svgfont = require('svgicons2svgfont');
const svg2ttf = require('svg2ttf');
const ttf2woff = require('ttf2woff');
const glob = require('glob');
const fs = require('fs');

glob(__dirname + '/*.svg', (err, files) => {
	const glyphs = [];
	let codepoint = 0xE600;
	files.forEach(file => {
		const name =  file.match(/([a-z\-]+)\.svg/)[1];
		glyphs.push({
			file,
			name,
			codepoint: codepoint++,
		});
	});
	console.log(glyphs);
	makeSvg(glyphs);
});

const makeSvg = glyphs => {
	let svgFont = new Buffer(0);
	const svgOptions = {
		fontName: 'circus-db-font',
		fontHeight: 512,
		log: () => {}
	};
	const fontStream = svgicons2svgfont(svgOptions)
		.on('data', data => {
			svgFont = Buffer.concat([svgFont, data]);
		})
		.on('end', () => {
			makeWoff(svgFont.toString(), glyphs);
		});

	glyphs.forEach(glyph => {
		const gfs = fs.createReadStream(glyph.file);
		const unicode = String.fromCharCode(glyph.codepoint);
		gfs.metadata = { name: glyph.name, unicode: [unicode] };
		fontStream.write(gfs);
	});
	fontStream.end();
};

const makeWoff = (svgFont, glyphs) => {
	const ttfBuf = svg2ttf(svgFont);
	const ttfFont = new Buffer(ttfBuf.buffer);
	const woffBuf = ttf2woff(new Uint8Array(ttfFont));
	const woffFont = new Buffer(woffBuf.buffer);
	fs.writeFileSync(
		__dirname + '/../../../public/css/circus-db-font.woff',
		woffFont
	);

	let css = glyphs.map(g => {
		return `.circus-icon-${g.name}::before { content: '\\${g.codepoint.toString(16)}'; }`;
	}).join('\n');
	css = '// Auto generated by fontgen.js\n\n' + css;

	fs.writeFileSync(__dirname + '/../less/glyphs.less', css);
};