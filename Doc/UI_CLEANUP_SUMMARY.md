
## UI Cleanup: Removed Phone Number and Student ID

### Changes
Removed "Phone Number" and "Student ID" fields from the user interface as they are optional and no longer required to be displayed.

### Files Modified
1.  **`src/components/auth/SignupForm.tsx`**
    - Removed `AuthInput` for Phone Number.
    - Removed `AuthInput` for Student ID.
    - Removed validation logic for phone and student ID in `validateForm` and `fieldErrors`.
    - Removed unused imports (`Phone`, `Car`, `validatePhone`, `validateStudentId`).

2.  **`src/components/admin/super/SectionAdminManagement.tsx`**
    - Removed `studentId` from the user search filter logic.
    - Updated search input placeholder from "Search users by name, email, or student ID" to "Search users by name or email".
    - Updated table header from "Email / Student ID" to "Email".
    - Removed `studentId` display from the user table rows.

### Verification
- Ran `npm run build` successfully.
- Verified that the fields are no longer present in the Signup form code.
- Verified that the fields are no longer present in the Admin Management UI code.
