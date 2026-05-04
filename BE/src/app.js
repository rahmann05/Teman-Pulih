const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
// const chatbotRoutes = require('./routes/chatbotRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
// const ocrRoutes = require('./routes/ocrRoutes');
// const profileRoutes = require('./routes/profileRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/chatbot', chatbotRoutes);
app.use('/api/medications', medicationRoutes);
// app.use('/api/ocr', ocrRoutes);
// app.use('/api/profile', profileRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});