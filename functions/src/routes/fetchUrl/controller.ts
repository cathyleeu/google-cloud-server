import axios from 'axios';
// @ts-ignore
import * as cheerio from 'cheerio';
import language from '@google-cloud/language';

const projectId = 'mystical-option-280602';
const keyFilename = '/Users/cathylee/Downloads/googleCloud-bb1d65b307f9.json';

import * as admin from 'firebase-admin';
const db = admin.firestore();

exports.fetchTagsFromUrl = async(req: any, res: any) => {
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


    const client = new language.LanguageServiceClient({projectId, keyFilename});
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
}

  exports.postUrlWithTags = async (req: any, res: any) => {
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
        .then((doc: any) => {
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
}