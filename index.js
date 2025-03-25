import app from './app.js';
import connectDB from './database/db.js';

const PORT = process.env.PORT || 8000;

// Connect to MongoDB first
connectDB().then(() => {
    // Start server only after successful database connection
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});


