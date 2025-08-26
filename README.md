# 🏐 Netball Live Scorer App

A **simple, web-based netball scoring application** for live game scoring and spectating. Built with Next.js and deployed on AWS Amplify.

## 🚀 Live Demo
**Production App**: https://master.d2ads5qqqqdckv.amplifyapp.com

## ✨ Features

### 🎮 Game Management
- **Create games** with custom team names and quarter lengths (10, 12, 15 minutes)
- **QR code generation** for easy spectator access
- **Shareable links** for game distribution

### 🔐 Admin Panel
- **Password protection** (default: `netball2025`)
- **Live scoring controls** (+/- goals for each team)
- **Timer management** (start/pause/next quarter/end game)
- **Real-time updates** with server-side authoritative timing
- **QR code sharing** (download, share, copy link)

### 👥 Spectator View
- **Live score updates** every 3 seconds
- **Synchronized timer** across all devices
- **Mobile responsive** design
- **Share functionality** for inviting others
- **No login required** - just scan QR or use link

### 🔄 Real-Time Synchronization
- **Server-side authoritative timer** prevents drift across devices
- **Persistent file storage** for multi-spectator access
- **Automatic game state sync** across all connected devices
- **Live score updates** without page refresh

## 🛠️ Technical Stack

- **Frontend**: Next.js 15.5.0, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with in-memory + file storage
- **Deployment**: AWS Amplify with automatic CI/CD
- **Libraries**: QRCode generation, UUID for game IDs
- **Real-time**: Polling-based updates (3s for spectators, 10s admin sync)

## 🏗️ Architecture

### Storage
- **Primary**: In-memory Map for fast access
- **Persistence**: File-based backup in `/tmp/netball-games.json`
- **Sync**: Cross-instance sharing via persistent file storage

### Timer System
- **Server-side calculation** based on `timerStartedAt` timestamp
- **Admin**: Smooth local countdown + 10s server sync
- **Spectators**: Pure server time via 3s polling
- **Automatic expiry** handled server-side

## 🚀 Quick Start

### Development
```bash
# Clone repository
git clone https://github.com/AdamSawtell/netballscoreapp.git
cd netballscoreapp

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🎯 Usage

### Creating a Game
1. Visit the home page
2. Enter team names (Team A and Team B)
3. Select quarter length (10, 12, or 15 minutes)
4. Click "Create Game"
5. Share the generated QR code or links

### Scoring (Admin)
1. Access admin panel with password: `netball2025`
2. Use +/- buttons to update scores
3. Control timer with Start/Pause/Next Quarter/End buttons
4. Share QR code with spectators anytime

### Spectating
1. Scan QR code or use shared link
2. View live scores and timer
3. Share game with others using built-in share options
4. Watch automatic updates every 3 seconds

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Custom admin password
ADMIN_PASSWORD=your_custom_password
```

### Game Settings
- **Quarter Lengths**: 10, 12, 15 minutes
- **Total Quarters**: 4 (fixed)
- **Default Quarter**: 15 minutes
- **Timer Updates**: Server-authoritative, sub-second accuracy

## 📱 Device Compatibility

- **Desktop**: Full admin and spectator functionality
- **Mobile**: Optimized responsive design
- **Tablets**: Touch-friendly interface
- **All Browsers**: Modern browser support (Chrome, Firefox, Safari, Edge)

## 🧪 Testing

### Comprehensive Testing Protocols
- **Timer Testing**: See `TIMER_TESTING.md` for 7-scenario timer test protocol
- **Full Function Testing**: See `FULL_FUNCTION_TEST.md` for 14-test comprehensive protocol

### Key Test Scenarios
1. Multi-device timer synchronization
2. QR code generation and sharing
3. Score updates across devices
4. Timer persistence during scoring
5. Multi-spectator concurrent access

## 🔍 Debugging

### Server Logs
Enhanced logging provides detailed information:
```
=== GAME STORAGE GET_GAME ===
Timestamp: 2025-01-26T03:15:30.123Z
Environment: production
Storage file: /tmp/netball-games.json
Game ID: abc123-def456
Additional info: { found: true, totalGames: 1 }
=====================================
```

### Common Issues
- **Game Not Found**: Check logs for storage file status
- **Timer Drift**: Server-side calculation prevents drift
- **Score Sync**: Automatic 3-second updates for spectators

## 🚀 Deployment

### AWS Amplify
The app is configured for AWS Amplify deployment with:
- **Build Configuration**: `amplify.yml`
- **Next.js Config**: Standalone output for serverless
- **Environment**: Production-ready settings

### Manual Deploy
```bash
# Build and deploy
npm run build
# Deploy to your hosting platform
```

## 📋 Recent Updates

### v1.3.0 - Timer Synchronization Fix
- ✅ Server-side authoritative timer
- ✅ Multi-device timer synchronization
- ✅ Persistent file storage for multi-spectator access
- ✅ Enhanced debugging and logging

### v1.2.0 - QR Sharing Enhancement
- ✅ Spectator QR code sharing functionality
- ✅ Universal sharing (download, native share, copy link)
- ✅ Collapsible share sections

### v1.1.0 - Critical Bug Fixes
- ✅ Timer no longer resets during scoring
- ✅ Quarter length display updates correctly
- ✅ Text visibility issues resolved
- ✅ Multi-spectator "game not found" errors fixed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (see testing protocols)
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

- Database storage (DynamoDB) for better scalability
- Advanced game statistics
- Multiple game management
- Tournament bracket support
- Historical game data

---

**Made with ❤️ for the netball community**