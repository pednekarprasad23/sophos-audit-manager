/**
 * Firewalls routes
 */

const express = require('express');
const router = express.Router();
const { ensureAuth, canManageSites } = require('../middleware/auth');

// Get all firewalls for a site
router.get('/site/:siteId', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        const [firewalls] = await db.execute(
            'SELECT * FROM firewalls WHERE site_id = ? ORDER BY name',
            [req.params.siteId]
        );
        res.json(firewalls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single firewall
router.get('/:id', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        const [firewalls] = await db.execute(
            'SELECT * FROM firewalls WHERE id = ?',
            [req.params.id]
        );
        
        if (firewalls.length === 0) {
            return res.status(404).json({ error: 'Firewall not found' });
        }
        
        res.json(firewalls[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create firewall
router.post('/', canManageSites, async (req, res) => {
    const { site_id, name, serial_number, model, firmware_version, api_key, status } = req.body;
    const db = req.db;

    try {
        const [result] = await db.execute(
            'INSERT INTO firewalls (site_id, name, serial_number, model, firmware_version, api_key, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [site_id, name, serial_number, model || null, firmware_version || null, api_key || null, status || 'active']
        );

        const [firewalls] = await db.execute('SELECT * FROM firewalls WHERE id = ?', [result.insertId]);
        res.json(firewalls[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update firewall
router.put('/:id', canManageSites, async (req, res) => {
    const { name, serial_number, model, firmware_version, api_key, status } = req.body;
    const db = req.db;

    try {
        await db.execute(
            'UPDATE firewalls SET name = ?, serial_number = ?, model = ?, firmware_version = ?, api_key = ?, status = ? WHERE id = ?',
            [name, serial_number || null, model || null, firmware_version || null, api_key || null, status || 'active', req.params.id]
        );

        const [firewalls] = await db.execute('SELECT * FROM firewalls WHERE id = ?', [req.params.id]);
        res.json(firewalls[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete firewall
router.delete('/:id', canManageSites, async (req, res) => {
    const db = req.db;
    
    try {
        await db.execute('DELETE FROM firewalls WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
