/**
 * Sites/Projects routes
 */

const express = require('express');
const router = express.Router();
const { ensureAuth, isAdmin, canManageSites } = require('../middleware/auth');

// Get all sites
router.get('/', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        const [sites] = await db.execute('SELECT * FROM sites ORDER BY name');
        res.json(sites);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single site
router.get('/:id', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        const [sites] = await db.execute('SELECT * FROM sites WHERE id = ?', [req.params.id]);
        
        if (sites.length === 0) {
            return res.status(404).json({ error: 'Site not found' });
        }
        
        res.json(sites[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create site
router.post('/', canManageSites, async (req, res) => {
    const { name, description, location } = req.body;
    const userId = req.session.userId;
    const db = req.db;
    
    try {
        const [result] = await db.execute(
            'INSERT INTO sites (name, description, location, created_by) VALUES (?, ?, ?, ?)',
            [name, description, location, userId]
        );
        
        const [sites] = await db.execute('SELECT * FROM sites WHERE id = ?', [result.insertId]);
        res.json(sites[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update site
router.put('/:id', canManageSites, async (req, res) => {
    const { name, description, location } = req.body;
    const db = req.db;
    
    try {
        await db.execute(
            'UPDATE sites SET name = ?, description = ?, location = ? WHERE id = ?',
            [name, description, location, req.params.id]
        );
        
        const [sites] = await db.execute('SELECT * FROM sites WHERE id = ?', [req.params.id]);
        res.json(sites[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete site
router.delete('/:id', isAdmin, async (req, res) => {
    const db = req.db;
    
    try {
        await db.execute('DELETE FROM sites WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
