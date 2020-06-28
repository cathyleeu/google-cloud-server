const router = require('express').Router;
import * as controller from './controller';


interface FetchUrlFns {
    fetchTagsFromUrl: any;
    postUrlWithTags: any;
}
const fetchApi = controller as FetchUrlFns;

router.get('/', fetchApi.fetchTagsFromUrl);
router.post('/url', fetchApi.postUrlWithTags)

module.exports = router;