const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
const port = 3000;
const { Note,User } = prisma;
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Use authentication middleware for protected routes
const session = require('express-session');

app.use(session({
    secret: 'kangarou',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true in production if using HTTPS
}));


app.get('/', (req, res) => {
    res.sendFile('pages/index.html', { root: __dirname });
});

// Redirect to the login page
app.get('/login', (req, res) => {
    res.sendFile('pages/login.html', { root: __dirname });
});

app.get('/signup', (req, res) => {
    res.sendFile('pages/signup.html', { root: __dirname});
});

app.post('/getnote', async (req, res) => {
    try {
        const userId = req.session.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in first' });
        }

        const { noteId } = req.body;

        if (noteId) {
            // If noteId is provided, fetch a single note by ID
            const note = await prisma.note.findUnique({
                where: { id: parseInt(noteId) },
            });

            if (!note) {
                return res.status(404).json({ success: false, message: 'Note not found' });
            }

            return res.status(200).json({ success: true, note });
        } else {
            // If noteId is not provided, fetch all notes for the user
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { notes: true },
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            return res.status(200).json({ success: true, notes: user.notes });
        }
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


  app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || user.password !== password) {
            return res.status(401).json
            ({ success: false, message: 'Invalid email or password' });
        }

        // Use a session management solution to keep the user logged in
        req.session.user = { id: user.id, email: user.email };

        res.status(200).json({
            success: true,
            user: { email: user.email, name: user.name },
            message: 'User found!',
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the user with the given email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // If the user doesn't exist, create a new user
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password, // In a production scenario, you should hash the password before saving it
            },
        });

        // Log success
        console.log('User created:', newUser);

        // Respond with JSON for successful signup
        res.json({ success: true, user: newUser });
    } catch (error) {
        // Log error
        console.error('Error during signup:', error);

        // Respond with JSON for signup failure
        res.status(500).json({ success: false, error: 'Failed to create user', details: error.message });
    }
});


app.post('/addnote', async (req, res) => {
    try {
        const { title, desc } = req.body;
        const userId = req.session.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in first' });
        }

        const note = await prisma.note.create({
            data: {
                title,
                desc,
                userId,
            },
        });

        res.json({ success: true, note });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/deletenote', async (req, res) => {
    try {
        const { noteId } = req.body;

        // Use Prisma client to delete the note based on the noteId
        await prisma.note.delete({
            where: { id: parseInt(noteId) }, // Assuming noteId is an integer
        });

        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/updatenote', async (req, res) => {
    try {
        console.log('Received request to update note:', req.body);

        const { noteId, updatedTitle, updatedDesc } = req.body;

        // Update the note in your database using Prisma
        const updatedNote = await prisma.note.update({
            where: { id: parseInt(noteId) },
            data: {
                title: updatedTitle,
                desc: updatedDesc,
            },
        });
        console.log('Note updated successfully:', updatedNote);
        res.json({ success: true, updatedNote });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


// Logout endpoint
app.post('/logout', (req, res) => {
    // Clear the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.post('/protected-route', async (req, res) => {
    // Use req.session.user to access the authenticated user

    res.json({ success: true, user: req.session.user });
});

// Start the server
app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`);
});