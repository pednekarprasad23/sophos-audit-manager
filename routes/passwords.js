/**
 * Password Manager routes
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { ensureAuth, isAdmin } = require('../middleware/auth');

// Algorithm for encryption (AES-256-GCM)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Get encryption key from environment or generate one
const getKey = () => {
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    return crypto.createHash('sha256').update(key).digest();
};

// Encrypt value
const encrypt = (value) => {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        iv: iv.toString('hex'),
        encrypted: encrypted,
        authTag: authTag.toString('hex')
    };
};

// Decrypt value
const decrypt = (encryptedData) => {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Invalid encrypted data');
    }
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
};

// Get all password entries for a site
router.get('/site/:siteId', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        const [entries] = await db.execute(
            'SELECT id, key_name, site_id, firewall_id, created_at, updated_at FROM password_entries WHERE site_id = ? ORDER BY key_name',
            [req.params.siteId]
        );
        res.json(entries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get password entry (returns decrypted)
router.get('/:id', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        const [entries] = await db.execute(
            'SELECT id, key_name, encrypted_value, iv, auth_tag, site_id, firewall_id FROM password_entries WHERE id = ?',
            [req.params.id]
        );
        
        if (entries.length === 0) {
            return res.status(404).json({ error: 'Password entry not found' });
        }
        
        const entry = entries[0];
        const decryptedValue = decrypt({
            encrypted: entry.encrypted_value,
            iv: entry.iv,
            authTag: entry.auth_tag
        });
        
        res.json({
            id: entry.id,
            key_name: entry.key_name,
            decrypted_value: decryptedValue,
            site_id: entry.site_id,
            firewall_id: entry.firewall_id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create password entry
router.post('/', ensureAuth, async (req, res) => {
    const { key_name, value, site_id, firewall_id } = req.body;
    const db = req.db;
    
    try {
        // Encrypt the value
        const encrypted = encrypt(value);
        
        const [result] = await db.execute(
            'INSERT INTO password_entries (key_name, encrypted_value, iv, auth_tag, site_id, firewall_id) VALUES (?, ?, ?, ?, ?, ?)',
            [key_name, encrypted.encrypted, encrypted.iv, encrypted.authTag, site_id, firewall_id]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            key_name: key_name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update password entry
router.put('/:id', ensureAuth, async (req, res) => {
    const { key_name, value } = req.body;
    const db = req.db;
    
    try {
        // Encrypt the value
        const encrypted = encrypt(value);
        
        await db.execute(
            'UPDATE password_entries SET key_name = ?, encrypted_value = ?, iv = ?, auth_tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [key_name, encrypted.encrypted, encrypted.iv, encrypted.authTag, req.params.id]
        );
        
        res.json({ success: true, key_name: key_name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete password entry
router.delete('/:id', ensureAuth, async (req, res) => {
    const db = req.db;
    
    try {
        await db.execute('DELETE FROM password_entries WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all password entries (admin only) - with decrypted values
router.get('/admin/all', isAdmin, async (req, res) => {
    const db = req.db;
    
    try {
        const [entries] = await db.execute(`
            SELECT pe.id, pe.key_name, pe.site_id, pe.firewall_id, pe.created_at, pe.updated_at,
                   pe.encrypted_value, pe.iv, pe.auth_tag,
                   s.name as site_name, f.name as firewall_name
            FROM password_entries pe
            LEFT JOIN sites s ON pe.site_id = s.id
            LEFT JOIN firewalls f ON pe.firewall_id = f.id
            ORDER BY s.name, f.name, pe.key_name
        `);
        
        // Decrypt all values
        const decryptedEntries = [];
        for (const entry of entries) {
            try {
                const decryptedValue = decrypt({
                    encrypted: entry.encrypted_value,
                    iv: entry.iv,
                    authTag: entry.auth_tag
                });
                
                decryptedEntries.push({
                    id: entry.id,
                    key_name: entry.key_name,
                    decrypted_value: decryptedValue,
                    site_id: entry.site_id,
                    firewall_id: entry.firewall_id,
                    site_name: entry.site_name,
                    firewall_name: entry.firewall_name,
                    created_at: entry.created_at,
                    updated_at: entry.updated_at
                });
            } catch (err) {
                console.error(`Failed to decrypt entry ${entry.id}`);
                decryptedEntries.push(entry);
            }
        }
        
        res.json(decryptedEntries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
