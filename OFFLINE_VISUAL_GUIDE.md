# NestTask Offline Features - Quick Visual Guide

## What You'll See

### 1. When You Go Offline

#### Top Toast Notification (3 seconds)
```
┌─────────────────────────────────┐
│  🚫  You're offline             │
└─────────────────────────────────┘
```
- Red background
- WiFi-off icon
- Auto-dismisses after showing

---

#### Persistent Offline Banner
```
┌───────────────────────────────────────────────────────────┐
│  ☁️  You're offline. Changes will sync when connection    │
│     is restored.                                          │
└───────────────────────────────────────────────────────────┘
```
- Amber/yellow background
- Stays visible while offline
- Positioned at the very top of the app

---

#### Navigation Bar Badge
```
┌─────────────────────────────────────────────────────────┐
│  NestTask [Offline]              🌙  📅  👤             │
└─────────────────────────────────────────────────────────┘
```
- Small red badge next to logo
- "Offline" text
- WiFi-off icon

---

### 2. When You Come Back Online

#### Success Toast (3 seconds, then disappears)
```
┌─────────────────────────────────┐
│  ✅  Back online                │
└─────────────────────────────────┘
```
- Green background
- WiFi icon
- Auto-dismisses after 3 seconds

---

#### All Indicators Disappear
- Banner disappears
- Badge in nav disappears
- App syncs data automatically in background

---

## User Flow Diagram

```
┌──────────────┐
│  App Starts  │
│   (Online)   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Normal Usage    │
│  - Live Data     │
│  - Instant Save  │
└──────┬───────────┘
       │
       ▼ [Network Lost]
┌─────────────────────────────────┐
│  Offline Mode Activated         │
│  ┌───────────────────────────┐  │
│  │ 🚫 You're offline         │  │  ← Toast (3s)
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ☁️ Offline Banner        │  │  ← Banner (persistent)
│  └───────────────────────────┘  │
│                                 │
│  App continues with:            │
│  - Cached data                  │
│  - Local changes queued         │
│  - Full functionality           │
└─────────┬───────────────────────┘
          │
          ▼ [Network Restored]
┌─────────────────────────────────┐
│  Back Online                    │
│  ┌───────────────────────────┐  │
│  │ ✅ Back online           │  │  ← Success toast (3s)
│  └───────────────────────────┘  │
│                                 │
│  - Indicators disappear         │
│  - Auto-sync starts             │
│  - Data refreshes               │
└─────────────────────────────────┘
```

## Detailed Screen States

### Online State (Normal)
```
┌────────────────────────────────────────────┐
│  NestTask              🌙  📅  👤          │ ← Nav bar (no badge)
├────────────────────────────────────────────┤
│                                            │
│  📊 Today's Tasks (5)                      │
│                                            │
│  ✓ Complete project proposal               │
│  □ Review pull requests                    │
│  □ Team meeting at 2 PM                    │
│                                            │
│  [Data loads from server]                  │
│  [Changes save immediately]                │
│                                            │
└────────────────────────────────────────────┘
```

### Offline State
```
┌────────────────────────────────────────────┐
│ ☁️ You're offline. Changes will sync...   │ ← Banner
├────────────────────────────────────────────┤
│  NestTask [Offline]    🌙  📅  👤          │ ← Nav with badge
├────────────────────────────────────────────┤
│                                            │
│  📊 Today's Tasks (5)                      │
│                                            │
│  ✓ Complete project proposal               │
│  □ Review pull requests                    │
│  □ Team meeting at 2 PM                    │
│                                            │
│  [Data loads from cache]                   │
│  [Changes queued for sync]                 │
│                                            │
└────────────────────────────────────────────┘
```

### Reconnecting State
```
┌────────────────────────────────────────────┐
│  ✅ Back online                            │ ← Success toast (fades)
├────────────────────────────────────────────┤
│  NestTask              🌙  📅  👤          │ ← Badge disappears
├────────────────────────────────────────────┤
│                                            │
│  📊 Today's Tasks (5)    🔄                │ ← Syncing indicator
│                                            │
│  ✓ Complete project proposal               │
│  □ Review pull requests                    │
│  □ Task added offline (syncing...)         │
│                                            │
│  [Syncing queued changes...]               │
│  [Refreshing data...]                      │
│                                            │
└────────────────────────────────────────────┘
```

## What Works Offline

### ✅ Available Offline
- View all previously loaded tasks
- Create new tasks
- Edit existing tasks
- Delete tasks
- Mark tasks as complete/incomplete
- Navigate between pages
- View cached course materials
- View cached routines
- Search cached data

### ❌ Requires Internet
- Initial login
- Password reset
- Loading new data (not in cache)
- File uploads
- Real-time updates from other users
- Admin functions (in most cases)

## Tips for Users

1. **Before Going Offline**
   - Make sure you've visited the pages you need
   - Data is cached automatically as you browse
   - Open tasks, courses, routines you might need

2. **While Offline**
   - Work normally - changes are saved locally
   - Look for the offline indicators
   - Don't worry - changes won't be lost

3. **After Reconnecting**
   - Wait for the sync to complete
   - Look for the "Back online" message
   - Pull to refresh if data seems stale

## Color Guide

| Color | Meaning | Usage |
|-------|---------|-------|
| 🔴 Red | Offline Warning | Toast, Badge, Border |
| 🟢 Green | Back Online Success | Toast notification |
| 🟡 Amber | Offline Info | Persistent banner |
| 🔵 Blue | Normal/Online | Default app state |

## Animation & Timing

- **Toast appears**: Slide down from top (300ms)
- **Toast disappears**: Fade out (300ms)
- **Banner appears**: Slide down (200ms)
- **Badge appears**: Fade in (150ms)
- **All indicators**: Remove smoothly when online

## Testing Checklist

- [ ] See red toast when going offline
- [ ] See amber banner while offline
- [ ] See "Offline" badge in navigation
- [ ] Can still use app offline
- [ ] See green toast when back online
- [ ] All indicators disappear when online
- [ ] Data syncs automatically
- [ ] No error messages

---

**Quick Test**: Turn on Airplane Mode → Check for indicators → Turn off → Verify sync
