const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World Template!');
});
app.get('/health', (req, res) => {
  res.send('OK');
});
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
