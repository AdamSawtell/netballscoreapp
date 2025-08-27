# 🧪 TESTING CHECKLIST - NO DEPLOYMENT WITHOUT THESE TESTS

## ✅ CRITICAL WORKFLOWS (MUST PASS)

### 1. TIMER FUNCTIONALITY
- [ ] Timer starts when Start button is clicked
- [ ] Timer displays countdown correctly  
- [ ] Timer pauses when Pause button is clicked
- [ ] Timer resumes correctly after pause
- [ ] Timer stops at 0:00 and enables Next Quarter button
- [ ] Timer state persists after page reload

### 2. SCORE FUNCTIONALITY  
- [ ] +1 Goal buttons increase scores correctly
- [ ] -1 Goal buttons decrease scores correctly
- [ ] Score updates don't affect timer state
- [ ] Scores persist after page reload

### 3. ADMIN/SPECTATOR SYNC
- [ ] Spectator view shows same timer as admin
- [ ] Spectator view syncs when admin starts/pauses timer
- [ ] Spectator view syncs when admin updates scores
- [ ] Sync works within 5 seconds maximum

### 4. GAME LIFECYCLE
- [ ] Game creation works with all quarter lengths (10, 12, 15 min)
- [ ] Admin password authentication works
- [ ] QR code generation works
- [ ] Game sharing links work

## 🔧 TECHNICAL TESTS

### API ENDPOINTS
- [ ] `POST /api/test-timer` createGame action
- [ ] `POST /api/test-timer` startTimer action  
- [ ] `POST /api/test-timer` pauseTimer action
- [ ] `POST /api/test-timer` addScore action
- [ ] `GET /api/test-timer?gameId=X` returns correct game
- [ ] Error handling for invalid requests

### STATE MANAGEMENT
- [ ] TimerManager initializes with isRunning: false
- [ ] Timer state doesn't get stuck in "already running"
- [ ] State synchronization between client and server
- [ ] No memory leaks in timer instances

### HOOKS INTEGRATION
- [ ] useAdminTimer hook functions work
- [ ] useSpectatorTimer hook syncs correctly
- [ ] Hook cleanup prevents memory leaks
- [ ] Error recovery in hooks

## 🚀 DEPLOYMENT SCRIPTS

### Before ANY deployment:
```bash
# Run all critical tests
npm run test:critical

# Run integration tests  
npm run test:integration

# Run unit tests
npm run test

# Safe deployment (tests + build + deploy)
npm run deploy:safe
```

### Manual Testing Steps:
1. Create new game
2. Go to admin panel (enter password)
3. Click Start - verify timer counts down
4. Click Pause - verify timer stops
5. Click Start again - verify timer resumes  
6. Add goals - verify scores update
7. Open spectator view - verify sync
8. Refresh admin page - verify persistence

## 🚨 FAILURE PROTOCOLS

### If ANY test fails:
1. **DO NOT DEPLOY**
2. Fix the issue immediately
3. Re-run all tests
4. Only deploy when ALL tests pass

### If manual testing reveals issues:
1. Create automated test to catch the issue
2. Fix the bug
3. Verify test now passes
4. Add test to this checklist

## 📊 TEST COVERAGE REQUIREMENTS

- **Timer functionality**: 100% coverage
- **API endpoints**: 100% coverage  
- **Critical user workflows**: 100% coverage
- **State persistence**: 100% coverage

## 🎯 QUALITY GATES

**NO DEPLOYMENT unless:**
- [ ] All unit tests pass
- [ ] All integration tests pass  
- [ ] All E2E critical workflows pass
- [ ] Manual testing checklist completed
- [ ] No console errors in production build
- [ ] Timer start button works correctly
- [ ] Score updates work correctly
- [ ] Admin/spectator sync works correctly

---

**REMEMBER: The timer start button failure should NEVER happen again. Every deployment must verify basic functionality works.**
