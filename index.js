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
  
  data.forEach(category => {
    category.events.forEach(event => {
      event.ref_image = `${prefix}${event.ref_image}`;
    });
  });

  return data;
};

// Function to categorize events based on current date
const categorizeEvents = (data) => {
  const now = new Date();

  const categories = {
    upcoming: [],
    ongoing: [],
    past: []
  };

  data.forEach(category => {
    category.events.forEach(event => {
      const start = new Date(event.event_start);
      const end = new Date(event.banner_end_time);

      if (now < start) {
        categories.upcoming.push(event);
      } else if (now >= start && now <= end) {
        categories.ongoing.push(event);
      } else {
        categories.past.push(event);
      }
    });
  });

  return [
    { type: 'upcoming', events: categories.upcoming },
    { type: 'ongoing', events: categories.ongoing },
    { type: 'past', events: categories.past },
    { type: 'announcements', events: data.find(cat => cat.type === 'announcements').events }
  ];
};

// Route to get the content of the JSON file with dynamic link
app.get('/data', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading file');

    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).send('Error parsing JSON');
    }

    const updatedData = addImagePrefix(jsonData);
    const categorizedData = categorizeEvents(updatedData);
    res.json(categorizedData);
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
