# Timer Testing Protocol

## 🧪 **Manual Testing Checklist**

### **Test 1: Basic Timer Functionality**
- [ ] Create a new game with any quarter length
- [ ] Go to admin panel
- [ ] Press "Start" button
- [ ] **VERIFY**: Timer counts down smoothly (15:00 → 14:59 → 14:58...)
- [ ] Wait 10 seconds, timer should show correct time

### **Test 2: Score Adding During Timer**
- [ ] Start timer as above
- [ ] Wait for timer to show 14:50 (10 seconds elapsed)
- [ ] Add +1 goal to Team A
- [ ] **VERIFY**: Timer continues from 14:49, 14:48, 14:47... (NO jumping)
- [ ] Add +1 goal to Team B
- [ ] **VERIFY**: Timer still continues smoothly
- [ ] Add multiple goals quickly
- [ ] **VERIFY**: Timer never restarts or jumps

### **Test 3: Pause/Resume Timer**
- [ ] Start timer
- [ ] Let run for 20 seconds
- [ ] Press "Pause"
- [ ] **VERIFY**: Timer stops at current time
- [ ] Press "Start" again
- [ ] **VERIFY**: Timer resumes from where it paused

### **Test 4: Spectator View Sync**
- [ ] Open admin panel in one browser tab
- [ ] Open spectator view in another tab
- [ ] Start timer in admin
- [ ] **VERIFY**: Both timers count down in sync
- [ ] Add scores in admin
- [ ] **VERIFY**: Spectator view updates scores but timer keeps running smoothly

### **Test 5: Quarter Transitions**
- [ ] Create game with 1-minute quarters for quick testing
- [ ] Start timer and let it run to 0:00
- [ ] **VERIFY**: Timer stops at 0:00, status shows "Ready"
- [ ] Press "Next Quarter"
- [ ] **VERIFY**: Timer resets to 1:00, quarter shows Q2

### **Test 6: Multiple Browser Sync**
- [ ] Open admin in Chrome
- [ ] Open spectator view in Firefox
- [ ] Start timer in Chrome
- [ ] **VERIFY**: Both browsers show same countdown
- [ ] Add scores in Chrome
- [ ] **VERIFY**: Firefox updates scores, timer stays in sync

### **Test 7: Network Interruption**
- [ ] Start timer
- [ ] Disconnect internet for 10 seconds
- [ ] Reconnect internet
- [ ] **VERIFY**: Timer continues smoothly without jumping

## 🐛 **Known Issues (Should be Fixed)**
- ❌ Timer jumping in 4-second loops
- ❌ Timer restarting when scores added
- ❌ Multiple timers conflicting

## ✅ **Expected Behavior**
- Timer counts down smoothly every second
- Adding scores NEVER affects timer
- Spectator views stay in sync
- Pause/resume works perfectly
- No network conflicts with local timer

## 🔧 **Technical Implementation**
- Uses `useRef` to track timer interval
- Local timer takes priority over API refresh
- API refresh paused during local timer operation
- Prevents multiple timer instances
