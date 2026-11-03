/**
 * Authentication routes
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = req.db;

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Register (admin only via API or invitation)
router.post('/register', async (req, res) => {
    const { username, password, role, email } = req.body;
    const db = req.db;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role || 'auditor', email]
        );

        res.json({ success: true, userId: result.insertId });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Server error' });
        }
        res.json({ success: true });
    });
});

// Get current user
router.get('/me', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Change password
router.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    const db = req.db;

    try {
        const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
