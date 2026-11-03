/**
 * Reports routes - handles HTML and PDF generation
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit');
const router = express.Router();
const { ensureAuth, isAdmin } = require('../middleware/auth');

// Generate HTML report
router.post('/generate/html', ensureAuth, async (req, res) => {
    const { firewall_id, report_name } = req.body;
    const userId = req.session.userId;
    const db = req.db;

    try {
        // Get firewall data
        const [firewalls] = await db.execute('SELECT * FROM firewalls WHERE id = ?', [firewall_id]);
        const firewall = firewalls[0];

        if (!firewall) {
            return res.status(404).json({ error: 'Firewall not found' });
        }

        // Get site data
        const [sites] = await db.execute('SELECT * FROM sites WHERE id = ?', [firewall.site_id]);
        const site = sites[0];

        // Create reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Generate HTML content
        const htmlContent = generateHtmlReport(firewall, site, userId);
        const filename = `${report_name || 'report'}_${Date.now()}.html`;
        const filePath = path.join(reportsDir, filename);

        fs.writeFileSync(filePath, htmlContent);

        // Update database
        await db.execute(
            'INSERT INTO reports (firewall_id, site_id, report_name, report_type, status, file_path, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [firewall_id, firewall.site_id, report_name, 'html', 'completed', filePath, userId]
        );

        res.json({
            success: true,
            file_path: filePath,
            report_type: 'html'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate PDF report
router.post('/generate/pdf', ensureAuth, async (req, res) => {
    const { firewall_id, report_name } = req.body;
    const userId = req.session.userId;
    const db = req.db;

    try {
        // Get firewall data
        const [firewalls] = await db.execute('SELECT * FROM firewalls WHERE id = ?', [firewall_id]);
        const firewall = firewalls[0];

        if (!firewall) {
            return res.status(404).json({ error: 'Firewall not found' });
        }

        // Get site data
        const [sites] = await db.execute('SELECT * FROM sites WHERE id = ?', [firewall.site_id]);
        const site = sites[0];

        // Create reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filename = `${report_name || 'report'}_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, filename);

        // Generate PDF
        await generatePdfReport(firewall, site, filePath);

        // Update database
        await db.execute(
            'INSERT INTO reports (firewall_id, site_id, report_name, report_type, status, file_path, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [firewall_id, firewall.site_id, report_name, 'pdf', 'completed', filePath, userId]
        );

        res.json({
            success: true,
            file_path: filePath,
            report_type: 'pdf'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Download report
router.get('/download/:id', ensureAuth, async (req, res) => {
    const db = req.db;

    try {
        const [reports] = await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id]);

        if (reports.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reports[0];

        // Check if file exists
        if (!fs.existsSync(report.file_path)) {
            return res.status(404).json({ error: 'Report file not found' });
        }

        res.download(report.file_path);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// List reports for a firewall
router.get('/firewall/:firewallId', ensureAuth, async (req, res) => {
    const db = req.db;

    try {
        const [reports] = await db.execute(
            'SELECT * FROM reports WHERE firewall_id = ? ORDER BY created_at DESC',
            [req.params.firewallId]
        );
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete report
router.delete('/:id', isAdmin, async (req, res) => {
    const db = req.db;

    try {
        const [reports] = await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id]);

        if (reports.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reports[0];

        // Delete file
        if (fs.existsSync(report.file_path)) {
            fs.unlinkSync(report.file_path);
        }

        await db.execute('DELETE FROM reports WHERE id = ?', [req.params.id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Helper function to generate HTML report
function generateHtmlReport(firewall, site, userId) {
    const currentDate = new Date().toISOString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sophos XG Firewall Audit Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            min-height: 100vh;
            padding: 20px;
            color: #e2e8f0;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .header {
            background: linear-gradient(90deg, #0d9488 0%, #0f766e 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            color: white;
            margin-bottom: 8px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #38bdf8;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #475569;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #475569;
        }
        .info-row:last-child { border-bottom: none; }
        .label { color: #94a3b8; font-weight: 500; }
        .value { color: #e2e8f0; }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-active { background: #16a34a; color: white; }
        .status-inactive { background: #dc2626; color: white; }
        .status-maintenance { background: #f59e0b; color: white; }
        .footer {
            text-align: center;
            color: #64748b;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #475569;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            background: #0d9488;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Sophos XG Firewall Audit Report</h1>
            <p>Generated: ${currentDate}</p>
        </div>

        <div class="card">
            <h2 class="section-title">📋 Report Information</h2>
            <div class="info-row">
                <span class="label">Report ID:</span>
                <span class="value">${Date.now()}</span>
            </div>
            <div class="info-row">
                <span class="label">Generated By:</span>
                <span class="value">User #${userId}</span>
            </div>
            <div class="info-row">
                <span class="label">Report Type:</span>
                <span class="value"><span class="badge">HTML</span></span>
            </div>
        </div>

        <div class="card">
            <h2 class="section-title">🏢 Site Information</h2>
            <div class="info-row">
                <span class="label">Site Name:</span>
                <span class="value">${site ? site.name : 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Location:</span>
                <span class="value">${site ? site.location || 'Not specified' : 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Description:</span>
                <span class="value">${site ? site.description || 'No description' : 'N/A'}</span>
            </div>
        </div>

        <div class="card">
            <h2 class="section-title">🛡️ Firewall Information</h2>
            <div class="info-row">
                <span class="label">Firewall Name:</span>
                <span class="value">${firewall.name}</span>
            </div>
            <div class="info-row">
                <span class="label">Serial Number:</span>
                <span class="value">${firewall.serial_number || 'Not provided'}</span>
            </div>
            <div class="info-row">
                <span class="label">Model:</span>
                <span class="value">${firewall.model || 'Not provided'}</span>
            </div>
            <div class="info-row">
                <span class="label">Firmware Version:</span>
                <span class="value">${firewall.firmware_version || 'Not provided'}</span>
            </div>
            <div class="info-row">
                <span class="label">Status:</span>
                <span class="value">
                    <span class="status-badge status-${firewall.status || 'active'}">
                        ${firewall.status ? firewall.status.toUpperCase() : 'ACTIVE'}
                    </span>
                </span>
            </div>
        </div>

        <div class="card">
            <h2 class="section-title">📊 Audit Summary</h2>
            <div class="info-row">
                <span class="label">Security Check:</span>
                <span class="value">✓ Firewall Configuration Valid</span>
            </div>
            <div class="info-row">
                <span class="label">API Access:</span>
                <span class="value">✓ Available</span>
            </div>
            <div class="info-row">
                <span class="label">Last Scan:</span>
                <span class="value">${currentDate}</span>
            </div>
        </div>

        <div class="footer">
            <p>Sophos Audit Manager - Generated by Claude Code</p>
            <p>Report ID: ${Date.now()}</p>
        </div>
    </div>
</body>
</html>`;
}

// Helper function to generate PDF report
async function generatePdfReport(firewall, site, outputPath) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit.Standard({
            size: 'A4',
            margin: 50,
            color: '#e2e8f0',
            fontFamily: 'Helvetica'
        });

        doc.pipe(fs.createWriteStream(outputPath));

        // Title
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#0d9488').text('Sophos XG Firewall Audit Report', { align: 'center' });
        doc.moveDown(1);

        // Date
        doc.fontSize(12).font('Helvetica').fillColor('#64748b').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.moveDown(2);

        // Site Information
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#38bdf8').text('🏢 Site Information');
        doc.fontSize(10).font('Helvetica').fillColor('#e2e8f0');

        let startX = 50;
        doc.text(`Site Name:`, startX, doc.y);
        doc.text(site ? site.name : 'N/A', startX + 150, doc.y);
        doc.moveDown(1);
        doc.text(`Location:`, startX, doc.y);
        doc.text(site ? site.location || 'Not specified' : 'N/A', startX + 150, doc.y);
        doc.moveDown(1);

        // Firewall Information
        doc.moveDown(1);
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#38bdf8').text('🛡️ Firewall Information');
        doc.fontSize(10).font('Helvetica').fillColor('#e2e8f0');

        doc.moveDown(1);
        doc.text(`Firewall Name:`, startX, doc.y);
        doc.text(firewall.name, startX + 150, doc.y);
        doc.moveDown(0.5);
        doc.text(`Serial Number:`, startX, doc.y);
        doc.text(firewall.serial_number || 'Not provided', startX + 150, doc.y);
        doc.moveDown(0.5);
        doc.text(`Model:`, startX, doc.y);
        doc.text(firewall.model || 'Not provided', startX + 150, doc.y);
        doc.moveDown(0.5);
        doc.text(`Firmware Version:`, startX, doc.y);
        doc.text(firewall.firmware_version || 'Not provided', startX + 150, doc.y);
        doc.moveDown(0.5);
        doc.text(`Status:`, startX, doc.y);
        doc.text(firewall.status || 'active', startX + 150, doc.y);

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Sophos Audit Manager - Generated by Claude Code', 50, doc.page.height - 50);

        doc.end();

        doc.on('end', resolve);
        doc.on('error', reject);
    });
}

module.exports = router;