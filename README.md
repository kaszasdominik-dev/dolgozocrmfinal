# 🎯 CRM4 - Worker & Project Management System

A comprehensive CRM system for HR teams and recruiters to manage workers, projects, trials, and statistics.

## ✨ Features

- 👥 **Worker Management** - Track all workers with detailed profiles
- 📊 **Project Management** - Organize projects with positions and requirements
- 🧪 **Trial System** - Schedule and manage worker trials
- 📋 **Waitlist** - Queue workers for upcoming projects
- 🗑️ **Archive (Kuka)** - Track rejected/unsuitable workers
- 📈 **Statistics** - Real-time project metrics and status breakdown
- 📱 **Mobile Friendly** - Responsive design for all devices
- 🔒 **Secure** - JWT auth, rate limiting, password policies, audit logging

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Python 3.11+
- MongoDB 4.4+

### Installation

```bash
# Clone repository
git clone https://github.com/primeworkscontact-beep/crm4.git
cd crm4/crm4-main

# Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure your environment

# Frontend setup
cd ../frontend
npm install

# Create test admin
python create_test_admin.py

# Start services
# Terminal 1: Backend
cd backend && python server.py

# Terminal 2: Frontend  
cd frontend && npm start
```

### Default Login
```
Email: admin@dolgozocrm.hu
Password: Admin123!
```

## 📱 Mobile Access

The system works on mobile devices. To access from your phone:
1. Find your computer's IP address
2. Open `http://[YOUR_IP]:3000` on mobile
3. Make sure both devices are on the same WiFi

## 📖 Documentation

- [📦 Installation Guide (Hungarian)](./TELEPITES_UTMUTATO.md)
- [🔐 Security Features](./backend/security.py)
- [🎨 UI Components](./frontend/src/components/)

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- MongoDB (Motor async driver)
- JWT Authentication
- bcrypt password hashing
- Rate limiting (slowapi)

**Frontend:**
- React.js
- Tailwind CSS
- shadcn/ui components
- Axios for API calls

## 📊 Key Features in Detail

### Copy Trial Workers
- Select which fields to copy (name, position, phone, email, notes)
- One-click copy to clipboard
- Formatted for easy sharing

### Archive System (Kuka)
- Automatically tracks workers with negative status
- View history of rejected workers
- Prevent re-hiring unsuitable candidates

### Statistics Dashboard
- Worker count by status
- Position fill rate
- Active vs archived workers
- Visual breakdown with charts

### Security
- Strong password policy (uppercase, lowercase, number, special char)
- Account lockout after 5 failed attempts
- Audit logging for all actions
- Rate limiting on sensitive endpoints
- Input sanitization

## 🔒 Production Deployment

For production use:

1. **Change JWT_SECRET** in `backend/.env`
2. **Set CORS_ORIGINS** to your domain
3. **Enable HTTPS** with SSL certificate
4. **Secure MongoDB** with authentication
5. **Use process manager** (PM2, systemd)

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**MongoDB connection failed:**
```bash
# Start MongoDB
sudo systemctl start mongodb
```

**Module not found:**
```bash
# Reinstall dependencies
pip install -r backend/requirements.txt
npm install --prefix frontend
```

## 📄 License

Proprietary - All rights reserved

## 👨‍💻 Author

CRM4 - Worker Management System
Version: 1.0  
Last Updated: 2025-02-20

---

**Ready for use on Monday! 🎊**
