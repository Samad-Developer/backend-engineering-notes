import express from 'express';

const app = express();

app.use(express.json());

const users = express.Router();
users.get('/', (req, res) => {
  res.json([]);
});

app.use('/users', users);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000);