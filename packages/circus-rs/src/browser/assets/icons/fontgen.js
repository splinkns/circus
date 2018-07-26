'ure strict';

// Use `npm run fontgen` to invoke this script.

// The generated LESS and WOFF are meant to be commited to the
// repository, because the generated WOFF is small enough and
// will not change frequently.

const svgicons2svgfont = require('svgicons2svgfont');
const svg2ttf = require('svg2ttf');
const ttf2woff = require('ttf2woff');
const glob = require('glob-promise');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    await create(__dirname, 'circus-rs-font', 'rs-icon');
  } catch (err) {
    console.error(err);
  }
}

main();

async function create(iconPath, fontName, prefix) {
  const files = await glob(path.join(iconPath, '*.svg'));
  const glyphs = [];
  files.sort();
  files.forEach(file => {
    const [, codepoint, name] = path
      .basename(file, '.svg')
      .match(/^u([0-9A-F]+)-([a-z\-]+)$/);
    glyphs.push({
      file,
      name,
      codepoint: parseInt(codepoint, 16)
    });
  });
  console.log(glyphs);
  makeSvg(glyphs, fontName, prefix);

  function makeSvg(glyphs) {
    let svgFont = Buffer.alloc(0);
    const svgOptions = {
      fontName,
      fontHeight: 512,
      descent: 73, // roughtly the same ratio used by Font Awesome
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
  }

  function makeWoff(svgFont, glyphs) {
    const ttfBuf = svg2ttf(svgFont);
    const ttfFont = Buffer.from(ttfBuf.buffer);
    const woffBuf = ttf2woff(new Uint8Array(ttfFont));
    const woffFont = Buffer.from(woffBuf.buffer);
    fs.writeFileSync(path.resolve(__dirname, `${fontName}.woff`), woffFont);

    let css = glyphs
      .map(g => {
        return `.${prefix}-${
          g.name
        }::before { content: '\\${g.codepoint.toString(16)}'; }`;
      })
      .join('\n');
    css = '// Auto generated by fontgen.js\n\n' + css;

    fs.writeFileSync(path.resolve(__dirname, `${fontName}-glyphs.less`), css);
  }
}
