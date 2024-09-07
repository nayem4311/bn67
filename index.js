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

// Function to dynamically add the prefix to ref images
const addImagePrefix = (data) => {
  const prefix = 'https://dl.dir.freefiremobile.com/common/Local/BD/Splashanno/';
  
  // Check if data has the expected structure
  if (!data.upcoming || !data.ongoing || !data.past || !data.announcements) {
    throw new Error('Data is missing expected structure');
  }

  // Add prefix to upcoming, ongoing, and past banners if ref_image exists
  const categories = ['upcoming', 'ongoing', 'past'];
  categories.forEach(category => {
    data[category].forEach(item => {
      if (item.ref_image) {
        item.refImage = `${prefix}${item.ref_image}`;
      }
    });
  });

  // Add prefix to announcements if ref_image exists
  data.announcements.forEach(announcement => {
    if (announcement.ref_image) {
      announcement.refImage = `${prefix}${announcement.ref_image}`;
    }
  });

  return data;
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
      console.log('Data read from file:', cachedData); // Add this line
      return callback(null, cachedData);
    } catch (parseErr) {
      return callback(parseErr);
    }
  });
};

// Route to get categorized events with optional query parameter
app.get('/data', (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';

  getData((err, data) => {
    if (err) return res.status(500).send('Error reading file');

    try {
      const processedData = addImagePrefix(data);

      if (!query) {
        return res.json(processedData);
      }

      // If user searches for a category (upcoming, ongoing, or past)
      if (['upcoming', 'ongoing', 'past'].includes(query)) {
        const categoryEvents = processedData[query] || [];
        return res.json({ type: query, events: categoryEvents });
      }

      // Otherwise, filter events by name across all categories
      const filteredData = Object.keys(processedData).reduce((result, category) => {
        if (category === 'announcements') {
          const filteredAnnouncements = processedData[category].filter(item => 
            item.title && item.title.toLowerCase().includes(query)
          );
          result[category] = filteredAnnouncements;
        } else {
          const filteredEvents = processedData[category].filter(item => 
            item.event_name && item.event_name.toLowerCase().includes(query)
          );
          result[category] = filteredEvents;
        }
        return result;
      }, {});

      // If no events or announcements match the query, return all data
      if (Object.values(filteredData).every(arr => arr.length === 0)) {
        return res.json(processedData);
      }

      res.json(filteredData);
    } catch (prefixErr) {
      res.status(500).send(`Error processing data: ${prefixErr.message}`);
    }
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
    cachedData = newData; // Update the cache
    res.send('Data updated successfully');
  });
});

// Serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

module.exports = app;  // Export the app for Vercel

// Set port for the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
