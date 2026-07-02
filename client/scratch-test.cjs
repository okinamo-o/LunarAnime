const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const res1 = await axios.get('https://anime-san.com/');
    const $1 = cheerio.load(res1.data);
    console.log('AnimeSan articles:', $1('article').length);
    console.log('AnimeSan items:', $1('.item').length);

    const res2 = await axios.get('https://gateanime.com/');
    const $2 = cheerio.load(res2.data);
    console.log('GateAnime articles:', $2('article').length);
    console.log('GateAnime items:', $2('.item').length);
  } catch(e) {
    console.error(e.message);
  }
}
test();
