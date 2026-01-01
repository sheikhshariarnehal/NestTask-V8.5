
## Brand Logo Update

### Changes
Replaced the generic `Layout` icon with the brand logo (`/icons/icon-512x512.png`) on the Auth Page and Reset Password Page.

### Files Modified
1.  **`src/pages/AuthPage.tsx`**
    - Replaced `Layout` icon in the desktop hero section with the brand logo image.
    - Replaced `Layout` icon in the mobile header section with the brand logo image.

2.  **`src/pages/ResetPasswordPage.tsx`**
    - Added the brand logo image to the header section for consistency.

### Verification
- Ran `npm run build` successfully.
- The logo should now appear on the login/signup screens and the password reset screen.
