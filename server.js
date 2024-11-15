const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://commmunity-pagebus.onrender.com' 
      : '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());

// In-memory storage (Replace with database in production)
const chatHistory = [];
const blogInteractions = {
  likes: {},
  comments: {}
};

// Maximum number of chat messages to store
const MAX_CHAT_HISTORY = 100;

// Add cleanup for disconnected sockets
const connectedSockets = new Set();

io.on('connection', (socket) => {
  connectedSockets.add(socket.id);
  
  console.log('A user connected:', socket.id);

  // Send all current data on connection
  socket.emit('initial data', {
    chatHistory,
    blogInteractions
  });

  // Send chat history when client requests it
  socket.on('request chat history', () => {
    socket.emit('chat history', chatHistory);
  });

  // Handle new chat messages
  socket.on('chat message', (msg) => {
    try {
      if (!msg || !msg.text) return;
      chatHistory.push(msg);
      if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory.shift();
      }
      io.emit('chat message', msg);
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  // Handle blog interactions
  socket.on('blog like', ({ blogId }) => {
    if (!blogInteractions.likes[blogId]) {
      blogInteractions.likes[blogId] = 0;
    }
    blogInteractions.likes[blogId]++;
    io.emit('blog likes updated', { 
      blogId, 
      likes: blogInteractions.likes[blogId] 
    });
  });

  socket.on('blog comment', ({ blogId, comment }) => {
    if (!blogInteractions.comments[blogId]) {
      blogInteractions.comments[blogId] = [];
    }
    blogInteractions.comments[blogId].push(comment);
    io.emit('blog comments updated', { 
      blogId, 
      comments: blogInteractions.comments[blogId] 
    });
  });

  // Send current blog interactions when requested
  socket.on('request blog interactions', () => {
    socket.emit('blog interactions', blogInteractions);
  });

  socket.on('disconnect', () => {
    connectedSockets.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

// API endpoints for blog interactions
app.get('/api/blog-interactions', (req, res) => {
  res.json(blogInteractions);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Add error handling for the HTTP server
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Add global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Implement proper error logging here
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Implement proper error logging here
});
