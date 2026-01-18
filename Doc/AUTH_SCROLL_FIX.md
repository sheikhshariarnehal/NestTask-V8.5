
## Auth Page Scrolling Fix

### Problem
Users reported that the Auth Page (Login/Signup) scrolling was not working, particularly on mobile devices or when the content exceeded the viewport height. The layout was using `min-h-screen` which allowed the page to grow, but on some mobile browsers, this caused issues with the address bar or keyboard overlay, or simply didn't trigger the expected scrolling behavior within the app shell.

### Root Cause
The layout relied on the document body scrolling (`min-h-screen` on the container). In a PWA or "app-like" context, it is often better to have a fixed-height container (`h-screen`) with an internal scrollable area (`overflow-y-auto`) to ensure the UI remains stable and the scrollbar is contained within the content area, respecting safe areas.

### Solution Applied
Refactored `AuthPage.tsx` and `ResetPasswordPage.tsx` to use a fixed-height layout pattern:

```tsx
<div className="h-screen w-full overflow-hidden relative">
  <div className="absolute inset-0 overflow-y-auto safe-area-inset-bottom">
    {/* Content */}
  </div>
</div>
```

### Files Fixed
1. **`src/pages/AuthPage.tsx`**
   - Changed root container to `h-screen overflow-hidden`.
   - Wrapped content in `absolute inset-0 overflow-y-auto`.
   - Ensured `safe-area-inset-bottom` is applied to the scrollable container.

2. **`src/pages/ResetPasswordPage.tsx`**
   - Applied the same fixed-height scrolling pattern for consistency.
