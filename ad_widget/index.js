const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
)`);

// Create ads table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    image_filename TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`);

const multer = require('multer');

// Set up storage engine for multer
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits:{fileSize: 1000000}, // 1MB limit
}).single('adImage'); // 'adImage' is the name of the form field

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'a-very-secret-key', // In production, use an env variable
    resave: false,
    saveUninitialized: true,
}));

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// Middleware for authentication and authorization
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

function isAdvertiser(req, res, next) {
    if (req.session.user && req.session.user.role === 'advertiser') {
        return next();
    }
    // Redirect to home or show an error message
    res.status(403).send('Forbidden: Access is allowed only for advertisers.');
}

// Advertiser Dashboard
app.get('/dashboard', isAuthenticated, isAdvertiser, (req, res) => {
    const userId = req.session.user.id;
    db.all(`SELECT * FROM ads WHERE user_id = ?`, [userId], (err, ads) => {
        if (err) {
            console.error(err.message);
            // Render an error page or redirect
            return res.redirect('/');
        }
        res.render('dashboard', { user: req.session.user, ads: ads });
    });
});

// Routes for creating ads
app.get('/ads/new', isAuthenticated, isAdvertiser, (req, res) => {
    res.render('new-ad');
});

app.post('/ads', isAuthenticated, isAdvertiser, (req, res) => {
    upload(req, res, (err) => {
        if(err){
            // Handle errors (e.g., file too large)
            res.render('new-ad', { msg: err });
        } else {
            if(req.file == undefined){
                // Handle no file selected
                res.render('new-ad', { msg: 'Error: No File Selected!' });
            } else {
                const { name, destination_url } = req.body;
                const image_filename = req.file.filename;
                const user_id = req.session.user.id;

                db.run(`INSERT INTO ads (name, destination_url, image_filename, user_id) VALUES (?, ?, ?, ?)`,
                    [name, destination_url, image_filename, user_id], function(err) {
                    if (err) {
                        console.error(err.message);
                        return res.send(err.message);
                    }
                    res.redirect('/dashboard');
                });
            }
        }
    });
});

function isPublisher(req, res, next) {
    if (req.session.user && req.session.user.role === 'publisher') {
        return next();
    }
    res.status(403).send('Forbidden: Access is allowed only for publishers.');
}

// Publisher Dashboard
app.get('/publisher/dashboard', isAuthenticated, isPublisher, (req, res) => {
    // For MVP, we'll show aggregate stats. A real app would track per-publisher.
    db.get(`SELECT SUM(impressions) AS total_impressions, SUM(clicks) AS total_clicks FROM ads`, (err, stats) => {
        if (err) {
            console.error(err.message);
            return res.redirect('/');
        }
        res.render('publisher-dashboard', { user: req.session.user, stats: stats });
    });
});

// Registration routes
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, role], function(err) {
            if (err) {
                console.error(err.message);
                // TODO: Handle username conflict more gracefully
                return res.redirect('/register');
            }
            console.log(`A new user has been created with ID ${this.lastID}`);
            res.redirect('/login');
        });
    } catch (error) {
        console.error(error);
        res.redirect('/register');
    }
});


// Login routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) {
            console.error(err.message);
            return res.redirect('/login');
        }
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            res.redirect('/');
        } else {
            // TODO: Provide feedback to the user that login failed
            res.redirect('/login');
        }
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid'); // The default session cookie name is 'connect.sid'
        res.redirect('/');
    });
});


// Ad Serving API
app.get('/api/ad', (req, res) => {
    // Select one ad at random
    db.get(`SELECT * FROM ads ORDER BY RANDOM() LIMIT 1`, (err, ad) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (ad) {
            res.json(ad);
        } else {
            res.status(404).json({ error: 'No ads available' });
        }
    });
});

// Impression tracking endpoint
app.post('/api/track/impression/:adId', (req, res) => {
    const adId = req.params.adId;
    db.run(`UPDATE ads SET impressions = impressions + 1 WHERE id = ?`, [adId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error tracking impression');
        }
        res.status(200).send('Impression tracked');
    });
});


// Click tracking endpoint
app.get('/api/track/click/:adId', (req, res) => {
    const adId = req.params.adId;
    db.get(`SELECT destination_url FROM ads WHERE id = ?`, [adId], (err, ad) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error finding ad');
        }
        if (ad) {
            db.run(`UPDATE ads SET clicks = clicks + 1 WHERE id = ?`, [adId], function(err) {
                if (err) {
                    console.error(err.message);
                }
                // Redirect to the actual destination
                res.redirect(ad.destination_url);
            });
        } else {
            res.status(404).send('Ad not found');
        }
    });
});


// Start server only if this file is run directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;
