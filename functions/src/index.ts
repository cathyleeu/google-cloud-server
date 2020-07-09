import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import axios from 'axios';
// @ts-ignore
import * as cheerio from 'cheerio';
import language from '@google-cloud/language';

const projectId = 'mystical-option-280602';
const keyFilename = '/Users/cathylee/Downloads/googleCloud-bb1d65b307f9.json';
const client = new language.LanguageServiceClient({projectId, keyFilename});
admin.initializeApp();
const db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

const app = express();
const main = express();
// const router = express.Router();


main.use(cors({origin: true}));
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended:false}));
// TODO: express router
main.use('/', app);

// main.use('/', require('./routes/index'));
// main.use('/fetch', require('./routes/fetchUrl/index'));

export const webApi = functions.https.onRequest(main);

app.get('/', (req, res) => {
  res.send('hello cathy')
})


app.get('/fetch', async(req, res) => {
  const url = req.query.url as string;
  const fetchUrl = await axios.get(url);
  const $ = cheerio.load(fetchUrl.data);
  const text = $('body').text();
  const metas = ['article:tag', 'og:title', 'og:description', 'description'];
  const metaText = metas.reduce((acc, meta) => {
    let content = $(`meta[property='${meta}']`).attr('content');
    if (meta === 'description') { content = $(`meta[name='${meta}']`).attr('content'); }
    if (content !== undefined) { acc += ` ${content}` }
    return acc;
  }, '');
  
  const document = { content: metaText+text, type: 'PLAIN_TEXT' };
  // @ts-ignore
  const [classification] = await client.classifyText({document});
  // @ts-ignore
  const [result] = await client.analyzeEntities({document});

  const tags = [] as any;
  const tagsEntities = [] as any;
  result.entities.forEach((entity: any) => {
    if(!tags.includes(entity.name)) {
      tags.push(entity.name);
      tagsEntities.push(entity)
    }
  })

  res.json({
    tags: tagsEntities.length > 30 ? tagsEntities.slice(0,30) : tagsEntities,
    categories: classification.categories
  })
})


app.post('/analyze', async (req, res) => {
  const {url, tags} = req.body;
  // TODO : cheerio <meta data> title, decs
  const fetchUrl = await axios.get(url);
  const $ = cheerio.load(fetchUrl.data);
  const title = $(`meta[name='title']`).attr('content');
  const desc = $(`meta[name='description']`).attr('content');

  const tagsRef = db.collection('tags');
  let tagIds = [] as any

  await tags.forEach((tag: any) => {
    tagsRef.doc(tag.name)
      .get()
      .then(doc => {
        // tags 에 있는지 없는지 먼저 확인 
        if (!doc.exists) {
          // 없으면 추가
          tagsRef.doc(tag.name).set({ ...tag, id: doc.id })
        }
      })
    tagIds.push(tag.name);
  })
  
  // db tags의 id 값을 url 에 같이 넣기
  await db.collection('urls').add({ url, tagIds, title, desc })
  res.send(200);
})

app.post('/analyze/comment', async (req, res) => {
  console.log('WORK');
  
  const {content} = req.body;
  const document = {content, type: 'PLAIN_TEXT'};
  // @ts-ignore
  const [sentiment] = await client.analyzeSentiment({document});
  // @ts-ignore
  const [entitySentiment] = await client.analyzeEntitySentiment({document});
  res.json({
    sentiment: sentiment.documentSentiment,
    entitySentiment: entitySentiment.entities,
  })
})