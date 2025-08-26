# 🚨 URGENT: QR Code Access Test Protocol

## **CRITICAL ISSUE**: Spectators getting "game not found" from QR codes

### **🔥 Immediate Test Sequence**

#### **Test A: Basic Game Creation & QR Access**
1. **CREATE GAME**:
   - Go to: https://master.d2ads5qqqqdckv.amplifyapp.com
   - Enter teams: "TestA" vs "TestB"
   - Select 10 minute quarters
   - Create game → Note Game ID from URL

2. **ADMIN ACCESS**:
   - Use admin link, enter password: `netball2025`
   - Verify admin panel loads
   - Start timer immediately
   - Add 1 goal to each team

3. **QR CODE TEST**:
   - **CRITICAL**: Use QR code from game creation success screen
   - Scan with phone or open viewer link in new browser/incognito
   - **EXPECTED**: Should show live game with scores
   - **ACTUAL**: Check if "game not found" appears

#### **Test B: Multi-Device QR Access**
1. **Create game** (as above)
2. **Start game** in admin panel  
3. **Test QR access from**:
   - Different browser (Chrome/Firefox/Edge)
   - Incognito/private window
   - Mobile device camera scan
   - Different computer/device
4. **Document** which devices show "game not found"

#### **Test C: Storage Persistence**
1. **Create game**
2. **Wait 2 minutes** (allow serverless function to potentially reset)
3. **Access via QR** → Check if game still exists
4. **Add scores in admin**
5. **Access via QR again** → Check if scores appear

### **🔍 Debug Information to Collect**

#### **Browser Console Logs**
- Open browser developer tools (F12)
- Check Console tab for any error messages
- Look for "GAME STORAGE" log entries
- Note any 404 or 500 API errors

#### **Network Tab Analysis**
- Open Network tab in dev tools
- Try to access game via QR
- Check if `/api/games/[id]` call returns 404
- Examine response body for error details

#### **Storage File Debugging**
- Check server logs for:
  - "NO_STORAGE_FILE_FOUND"
  - "LOAD_ERROR" messages
  - File existence status
  - Game IDs in storage

### **🚨 Expected vs Actual Results**

#### **EXPECTED Behavior**:
- ✅ QR code opens spectator view immediately
- ✅ Live scores and timer visible
- ✅ Multiple spectators can access simultaneously
- ✅ Game persists across different browsers/devices

#### **POTENTIAL Issues**:
- ❌ "/tmp" storage cleared by serverless platform
- ❌ Different Lambda instances serving different requests
- ❌ Game ID mismatch between creation and access
- ❌ Storage file permissions or path issues

### **🔧 Immediate Action Items**

If "game not found" confirmed:
1. **Implement database storage** (urgent)
2. **Add storage redundancy** mechanisms
3. **Improve error handling** with fallbacks
4. **Add game recovery** options

### **⏰ Test Timeline**
- **Immediate**: Run Test A (5 minutes)
- **Within 10 min**: Run Test B with multiple devices
- **Within 15 min**: Run Test C for persistence
- **Report findings**: Document exact failure scenarios

**CRITICAL: This issue breaks the core functionality of spectator access via QR codes. Immediate investigation and fix required.**

