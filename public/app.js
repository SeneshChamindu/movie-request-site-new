
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({
    online: false,
    message: 'Bot not connected'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
  
