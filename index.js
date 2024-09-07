const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const dataFile = path.join(__dirname, 'data.json');

let cachedData = null;

// Enable CORS
app.use(cors());
app.use(bodyParser.json());

// Function to dynamically add the prefix to ref images and image numbers
const addImagePrefixAndNumbers = (data) => {
  const prefix = 'https://dl.dir.freefiremobile.com/common/Local/BD/Splashanno/';
  
  // We assume the data is now a flat array (since you're removing the categories)
  const allItems = Array.isArray(data) ? data : [];  // Ensure data is an array
  
  // Add prefix and assign image number
  allItems.forEach((item, index) => {
    if (item.ref_image) {
      item.refImage = `${prefix}${item.ref_image}`;
      item.imageNumber = index + 1;  // Assigning image number based on position
    }
  });

  return allItems;
};

// Function to get data with caching
const getData = (callback) => {
  if (cachedData) {
    return callback(null, cachedData);
  }

  fs.readFile(dataFile, 'utf8', (err, data) => {
    if (err) return callback(err);
    try {
      cachedData = JSON.parse(data);
      console.log('Data read from file:', cachedData); // Debugging log
      return callback(null, cachedData);
    } catch (parseErr) {
      return callback(parseErr);
    }
  });
};

// Route to get events with optional query parameter based on image number
app.get('/data', (req, res) => {
  const query = req.query.q ? parseInt(req.query.q) : null;

  getData((err, data) => {
    if (err) return res.status(500).send('Error reading file');

    try {
      const processedData = addImagePrefixAndNumbers(data);

      if (!query) {
        return res.json(processedData);  // Return all data if no query
      }

      // Filter by image number
      const filteredData = processedData.filter(item => item.imageNumber === query);

      // If no data matches the query, return all data
      if (filteredData.length === 0) {
        return res.json(processedData);
      }

      res.json(filteredData);
    } catch (prefixErr) {
      res.status(500).send(`Error processing data: ${prefixErr.message}`);
    }
  });
});

module.exports = app;  // Export the app for Vercel

// Set port for the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
