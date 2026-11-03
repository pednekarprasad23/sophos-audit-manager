# Sophos XG Firewall Audit Manager

A Docker-based web application for managing Sophos XG Firewall audits with multi-site support, password management, and HTML/PDF report generation.

## 🚀 Quick Start

### Prerequisites
- Docker
- Docker Compose

### Running the Application

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The application will be available at `http://localhost:9005`

## 🔐 Default Credentials

**Username:** `admin`  
**Password:** `admin`

> ⚠️ **Important:** Change the default password immediately in production!

## 📁 Project Structure

```
sophos-audit-manager/
├── Dockerfile              # Node.js application container
├── docker-compose.yml      # Multi-container setup (app + MariaDB)
├── package.json            # Node.js dependencies
├── server.js               # Main Express application
├── db.js                   # Database connection module
├── database/
│   └── schema.sql          # Database schema
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── sites.js            # Sites/Projects management
│   ├── firewalls.js        # Firewalls management
│   ├── reports.js          # Report generation (HTML/PDF)
│   └── passwords.js        # Password manager routes
├── middleware/
│   └── auth.js             # Authentication middleware
├── views/
│   ├── login.html          # Login page
│   ├── dashboard.html      # Main dashboard
│   ├── sites.html          # Sites management
│   ├── firewalls.html      # Firewalls management
│   ├── reports.html        # Reports management
│   ├── passwords.html      # Password manager
│   └── admin.html          # Admin panel
├── public/
│   └── css/
│       └── admin.css       # Global styles
├── reports/                # Generated reports (mounted volume)
├── data/                   # Database storage (mounted volume)
└── templates/              # Report templates
```

## 🏢 Features

### Multi-Site Management
- Create and manage multiple Sites/Projects
- Organize firewalls by site
- Site-level password management

### Firewall Management
- Add firewall records with serial number, model, firmware version
- Track API keys securely
- Status monitoring (active/inactive/maintenance)

### Password Manager
- AES-256-GCM encrypted password storage
- Site-level and firewall-specific credentials
- Admin-only decryption access
- Global encryption key management

### Report Generation
- Generate HTML reports (interactive, downloadable)
- Generate PDF reports (print-ready)
- Reports stored locally with full history
- Include firewall and site information

## 🛠️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `db` | Database host |
| `DB_PORT` | `3306` | Database port |
| `DB_USER` | `audit_user` | Database user |
| `DB_PASSWORD` | `audit_user_pass_2024` | Database password |
| `DB_NAME` | `sophos_audit` | Database name |
| `SESSION_SECRET` | *(auto-generated)* | Session encryption key |
| `ENCRYPTION_KEY` | *(auto-generated)* | Password manager key |

### Ports

| Port | Service |
|------|---------|
| 9005 | Web Application |
| 3306 | MariaDB |

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full system access, manage users, all sites |
| `site_manager` | Manage sites, manage firewalls within sites |
| `auditor` | View reports, read-only access |

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Sites
- `GET /api/sites` - List all sites
- `GET /api/sites/:id` - Get site
- `POST /api/sites` - Create site
- `PUT /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Delete site

### Firewalls
- `GET /api/firewalls/site/:siteId` - List site firewalls
- `GET /api/firewalls/:id` - Get firewall
- `POST /api/firewalls` - Create firewall
- `PUT /api/firewalls/:id` - Update firewall
- `DELETE /api/firewalls/:id` - Delete firewall

### Reports
- `POST /api/reports/generate/html` - Generate HTML report
- `POST /api/reports/generate/pdf` - Generate PDF report
- `GET /api/reports/firewall/:firewallId` - List firewall reports
- `GET /api/reports/download/:id` - Download report
- `DELETE /api/reports/:id` - Delete report

### Passwords
- `GET /api/passwords/site/:siteId` - List site passwords
- `GET /api/passwords/:id` - Get password (decrypted)
- `POST /api/passwords` - Create password entry
- `PUT /api/passwords/:id` - Update password
- `DELETE /api/passwords/:id` - Delete password entry
- `GET /api/passwords/admin/all` - Admin: list all passwords

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Run locally (requires MySQL/MariaDB)
npm start
```

### Database Setup

```bash
# Initialize database
node init-db.js
```

## 📄 Reports

Reports are stored in the `./reports` directory:
- HTML reports are interactive and viewable in browsers
- PDF reports are print-ready

## 🔄 Future Enhancements

- Integration with Sophos XG Firewall API for automated audits
- Scheduled report generation
- Email notifications
- Advanced audit checks
- Custom report templates

## 🤝 Contributing

This project was created by Claude Code. Feel free to request features or modifications.

## 📜 License

MIT License

---

🔒 Generated with [Claude Code](https://claude.com/claude-code)