import app from '../src/index.js';
app.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('MQ3: http://localhost:'+(process.env.PORT||3000)+' — admin: /admin'));
