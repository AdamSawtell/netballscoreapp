# 🧪 Complete Function Testing Protocol

## **CRITICAL: Test ALL Functions After Every Fix**

### **🎯 Test 1: Game Creation**
- [ ] Go to home page
- [ ] Enter Team A name: "Test Team A"
- [ ] Enter Team B name: "Test Team B" 
- [ ] Select quarter length: 15 minutes
- [ ] Click "Create Game"
- [ ] **VERIFY**: Success screen shows with QR code
- [ ] **VERIFY**: "Start Scoring" button works
- [ ] **VERIFY**: "Preview Spectator View" opens viewer
- [ ] **VERIFY**: Copy link button works

### **🔐 Test 2: Admin Authentication**
- [ ] Go to admin URL from game creation
- [ ] Try wrong password: "wrong123"
- [ ] **VERIFY**: Error message appears
- [ ] Enter correct password: "netball2025"
- [ ] **VERIFY**: Admin panel loads
- [ ] **VERIFY**: QR code appears in sharing section

### **⚽ Test 3: Scoring Functions**
- [ ] In admin panel, add +1 goal to Team A
- [ ] **VERIFY**: Team A score shows 1
- [ ] Add +1 goal to Team B
- [ ] **VERIFY**: Team B score shows 1
- [ ] Add multiple goals to both teams
- [ ] **VERIFY**: All scores update correctly
- [ ] Try -1 goal from Team A
- [ ] **VERIFY**: Score decreases (or stays at 0)

### **⏱️ Test 4: Timer Functions**
- [ ] **VERIFY**: Timer shows 15:00 initially
- [ ] Click "Start" button
- [ ] **VERIFY**: Timer counts down (15:00 → 14:59 → 14:58...)
- [ ] **VERIFY**: Status shows "🔴 LIVE"
- [ ] Wait 10 seconds
- [ ] Click "Pause"
- [ ] **VERIFY**: Timer stops at current time
- [ ] Click "Start" again
- [ ] **VERIFY**: Timer resumes from paused time

### **🏐 Test 5: Scoring During Live Timer**
- [ ] Start timer
- [ ] Let run for 10 seconds (should be 14:50)
- [ ] Add +1 goal to Team A
- [ ] **VERIFY**: Score updates AND timer continues smoothly
- [ ] Add +1 goal to Team B
- [ ] **VERIFY**: Score updates AND timer continues smoothly
- [ ] **VERIFY**: No timer jumps or restarts

### **👀 Test 6: Spectator View Updates**
- [ ] Open spectator view in new tab/browser
- [ ] In admin: Start timer
- [ ] **VERIFY**: Spectator timer counts down
- [ ] In admin: Add goals to both teams
- [ ] **VERIFY**: Spectator scores update within 3 seconds
- [ ] **VERIFY**: Spectator timer stays in sync
- [ ] In admin: Pause timer
- [ ] **VERIFY**: Spectator timer stops

### **📱 Test 7: QR Code Functions**
- [ ] **VERIFY**: QR code visible in admin panel
- [ ] **VERIFY**: QR code visible in game creation success
- [ ] Test QR code with phone camera
- [ ] **VERIFY**: QR code opens spectator view
- [ ] **VERIFY**: Spectator view works on mobile

### **🔄 Test 8: Quarter Progression**
- [ ] Let timer run to 0:00 OR create 1-minute game for speed
- [ ] **VERIFY**: Timer stops at 0:00
- [ ] **VERIFY**: Status shows "⏰ Ready"
- [ ] Click "Next Quarter"
- [ ] **VERIFY**: Quarter advances (Q1 → Q2)
- [ ] **VERIFY**: Timer resets to full time
- [ ] **VERIFY**: Scores remain the same

### **🏁 Test 9: End Game Function**
- [ ] Click "End Game"
- [ ] **VERIFY**: Status shows "🏁 Finished"
- [ ] **VERIFY**: Timer stops
- [ ] **VERIFY**: All buttons disabled appropriately
- [ ] **VERIFY**: Final scores preserved

### **🔗 Test 10: Link Sharing**
- [ ] Copy viewer link from admin panel
- [ ] Open in incognito/private browser
- [ ] **VERIFY**: Spectator view loads without password
- [ ] **VERIFY**: Shows current game state
- [ ] **VERIFY**: Auto-updates when admin makes changes

### **📊 Test 11: Multi-Browser Sync**
- [ ] Open admin in Chrome
- [ ] Open spectator in Firefox  
- [ ] Open spectator in Safari/Edge
- [ ] Start timer in Chrome
- [ ] **VERIFY**: All browsers show countdown
- [ ] Add scores in Chrome
- [ ] **VERIFY**: All browsers update scores
- [ ] **VERIFY**: Timers stay synchronized

### **🌐 Test 12: Mobile Compatibility**
- [ ] Open admin panel on mobile
- [ ] **VERIFY**: All buttons are touch-friendly
- [ ] **VERIFY**: Timer and scores clearly visible
- [ ] Open spectator view on mobile
- [ ] **VERIFY**: Responsive design works
- [ ] **VERIFY**: QR code scanning works

### **⚠️ Test 13: Error Handling**
- [ ] Try accessing invalid game ID
- [ ] **VERIFY**: "Game not found" error
- [ ] Disconnect internet during game
- [ ] **VERIFY**: Graceful handling when reconnected
- [ ] Try rapid clicking of score buttons
- [ ] **VERIFY**: No crashes or duplicate scores

### **🎮 Test 14: Complete Game Flow**
- [ ] Create new game
- [ ] Start timer
- [ ] Play simulated quarter (add multiple scores)
- [ ] Let timer run to 0:00
- [ ] Next quarter
- [ ] Play Q2 with more scores
- [ ] Continue through all 4 quarters
- [ ] End game
- [ ] **VERIFY**: Final scores correct and preserved

## **✅ PASS CRITERIA**
- **ALL 14 tests must pass**
- **No timer jumping or restarting**  
- **Scores update in real-time**
- **QR codes work perfectly**
- **Mobile compatibility confirmed**
- **Multi-browser sync working**

## **❌ FAILURE = IMMEDIATE FIX REQUIRED**
If ANY test fails, deployment should be stopped and issue fixed before proceeding.

## **🚀 Post-Test Deployment Checklist**
- [ ] All 14 tests passed
- [ ] Build completes successfully
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Ready for live use
