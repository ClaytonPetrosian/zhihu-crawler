const rp = require('request-promise');
const fs = require('fs');
const cheerio = require('cheerio');
const htmlDecode = require('./htmlDecode');
const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.addRule('filterImg', {
  filter: 'figure',
  replacement: function(content) {
    const $ = cheerio.load(content);
    const imgUrl = $('img').attr('src');
    return `![图片](${imgUrl})`
  }
})
async function getAnswerLink(topicId){
  const res = await rp(`https://www.zhihu.com/topic/${topicId}/top-answers`);
  const $ = cheerio.load(res);
  const AnswerItem = $('.AnswerItem');
  const data = AnswerItem.map((i,e) => $(e).data('zop')).get();
  const links = AnswerItem.map((i,e) => $(e).find('a').attr('href')).get();
  return data.map((item, index) => ({ ...item, link: links[index]}));
}
async function getAnswer(data){
  const res = await rp(`https://www.zhihu.com${data.link}`);
  const $ = cheerio.load(res);
  const html = htmlDecode($('.CopyrightRichText-richText').html());
  const info = `<h2>${data.title}</h2><h4>${data.authorName}</h4>`;
  const markdown = turndownService.turndown(`${info}${html}`);
  fs.writeFile(`${data.title}.md`, markdown, (err) => {
    if (err) throw err;
    console.log(`成功写入文件：${data.title}.md`);
  })
  return html;
}
async function main() {
  const links = await getAnswerLink(20011711);
  links.forEach((v, i) => getAnswer(v, i));
}
main();
