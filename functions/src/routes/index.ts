var express = require('express');
var router = express.Router();

router.get('/', function(req: any, res: any, next: any) {
    res.send('index page');
});

//모듈에 등록해야 web.js에서 app.use 함수를 통해서 사용 가능
module.exports = router;