const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const dataFile = path.join(__dirname, 'data.json');

// Enable CORS
app.use(cors());
app.use(bodyParser.json());

// Function to dynamically add the prefix to ref images
const addImagePrefix = (data) => {
  const prefix = 'https://dl.dir.freefiremobile.com/common/Local/BD/Splashanno/';
  
  // Add prefix to ref images in banners
  data.banners.forEach(banner => {
    banner.refImage = `${prefix}${banner.ref_image}`;
  });
  
  // Add prefix to ref images in announcements
  data.announcements.forEach(announcement => {
    announcement.refImage = `${prefix}${announcement.ref_image}`;
  });

  return data;
};

// Route to get the content of the JSON file with dynamic link
app.get('/data', (req, res) => {
  const { type, id } = req.query;  // Extract query parameters

  fs.readFile(dataFile, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading file');

    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).send('Error parsing JSON');
    }

    let filteredData = addImagePrefix(jsonData);

    // Filter data based on query parameters
    if (type) {
      if (type === 'banners') {
        filteredData.banners = filteredData.banners.filter(banner => !id || banner.ref_image === id);
      } else if (type === 'announcements') {
        filteredData.announcements = filteredData.announcements.filter(announcement => !id || announcement.ref_image === id);
      } else {
        return res.status(400).send('Invalid type parameter');
      }
    }

    res.json(filteredData);
  });
});

// Admin route to update the content of the JSON file
app.post('/update-data', (req, res) => {
  const newData = req.body;

  if (!newData) {
    return res.status(400).send('Content is required');
  }

  fs.writeFile(dataFile, JSON.stringify(newData, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).send('Error writing file');
    res.send('Data updated successfully');
  });
});

// Serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

module.exports = app;  // Export the app for Vercel

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
