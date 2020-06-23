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

admin.initializeApp();

const app = express();
const main = express();
// const router = express.Router();


main.use(cors({origin: true}));
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended:false}));
main.use('/', app);

// const db = admin.firestore();
export const webApi = functions.https.onRequest(main);

app.get('/', (req, res) => {
  res.send('hello cathy')
})

app.get('/fetch', async(req, res) => {
  const url = req.query.url as string;
  const fetchUrl = await axios.get(url);
  const $ = cheerio.load(fetchUrl.data);
  const text = $('body').text();

  const client = new language.LanguageServiceClient({projectId, keyFilename});
  const document = { content: text, type: 'PLAIN_TEXT' };
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

app.post('/postUrl', (req, res) => {
  console.log(req.body);
  
})