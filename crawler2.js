const Nightmare = require('nightmare')
const config = require('./config');
const readline = require('readline');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let verifyCode;

const nightmare = new Nightmare({
     show: true,
     dock: true,
     waitTimeout: 10000,
     openDevTools: true
 })
  nightmare.goto(`https://www.zhihu.com/topic/${config.topicID}/organize/entire`)
    .wait('.SignFlow-accountInput')
    .type('.SignFlow-accountInput.Input-wrapper > input', config.phone)
    .click('.SignFlow-smsInputButton')
    .then(() => {
      rl.question('请输入验证码: ', function(code) {
        console.log('你输入的验证码: %s', code);
        verifyCode = code;
        rl.close();
        nightmare.type('.SignFlow-smsInputContainer input', verifyCode)
        .click('.Card.SignContainer-content > div > form > button')
        .wait('#zh-topic-organize-page-children')
        .wait(() => {
          const lastItem = document.querySelector('#zh-topic-organize-page-children > ul > li > .zm-topic-organize-list> li:last-child');
          window.scrollTo(0, document.body.clientHeight);
          if (!lastItem || lastItem.innerText.indexOf('加载中...') > -1) return false;
          else if (lastItem.innerText.indexOf('加载更多') > -1) { lastItem.querySelector('a').click();return false; }
          else return true;
         })
        .evaluate(() => document.querySelector('.zm-topic-organize-list').innerHTML)
        .end()
        .then(list => {
          let $ = cheerio.load(list);
          const file = $('li').not('.zm-topic-organize-loadmore').map((i, e) => {
            const el = $(e).children('a');
            return {
              name: el.text(),
              href: el.attr('href')
            };
          }).get();

          const mongoose = require('mongoose');
          const Schema = mongoose.Schema;
          const connect = mongoose.createConnection('mongodb://localhost:27017/zhihu',{ useNewUrlParser: true, useUnifiedTopology: true });

          const topicSchema = new Schema({
            name: { type: String, require:true },
            href: { type: String, require:true },
            date: { type: Date, default: Date.now },
          });

          const topics = mongoose.model('Topics', topicSchema);
          topics.insertMany(file, (err,doc)=>{
            console.log(err, doc);
            connect.close();
          })
        })
      });
    })
