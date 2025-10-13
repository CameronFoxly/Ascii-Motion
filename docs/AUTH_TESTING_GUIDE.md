# Authentication Testing Guide

## Overview
This guide walks you through testing the newly integrated authentication system in ASCII Motion.

## Prerequisites
- Dev server running: `npm run dev`
- Browser open at: http://localhost:5175/
- Access to email account for verification testing

## Test Scenarios

### 1. Sign Up Flow (New User)

**Steps:**
1. Click "Sign Up" button in the top-right toolbar
2. Enter email address (use a real email you can access)
3. Enter password (minimum 6 characters)
4. Confirm password (must match)
5. Click "Sign Up"

**Expected Results:**
- ✅ Form validates all fields
- ✅ Password mismatch shows error
- ✅ Short password shows error
- ✅ Success screen appears with instructions
- ✅ Email sent to your inbox (check spam folder)
- ✅ Can click link in email to verify account

**Common Issues:**
- Email not received? Check spam folder, wait 2-3 minutes
- Error "User already exists"? Email is already registered

---

### 2. Email Verification

**Steps:**
1. Open the verification email from Supabase
2. Click the verification link
3. Should redirect to Supabase confirmation page
4. Return to ASCII Motion app

**Expected Results:**
- ✅ Email link works and confirms account
- ✅ Account is now verified and ready to sign in

---

### 3. Sign In Flow (Existing User)

**Steps:**
1. Click "Sign In" button in toolbar
2. Enter your email and password
3. Click "Sign In"

**Expected Results:**
- ✅ Sign in button appears for logged-out users
- ✅ Form validates email and password
- ✅ Wrong credentials show error: "Invalid email or password"
- ✅ Unverified email shows: "Please verify your email address"
- ✅ Successful sign in closes dialog
- ✅ User avatar appears in toolbar (shows initials)
- ✅ Sign Up/Sign In buttons are replaced with UserMenu

---

### 4. User Menu (Logged In)

**Steps:**
1. Sign in (if not already)
2. Click the user avatar in top-right toolbar
3. Observe the dropdown menu

**Expected Results:**
- ✅ Shows user email address
- ✅ Shows "Free Plan" tier indicator
- ✅ "Sign Out" option available
- ✅ Clicking "Sign Out" logs out user
- ✅ After sign out, shows Sign Up/Sign In buttons again

---

### 5. Password Reset Flow

**Steps:**
1. Click "Sign In" button
2. Click "Forgot password?" link
3. Enter your email address
4. Click "Send Reset Link"
5. Check email for password reset link
6. Click link and set new password
7. Return to app and sign in with new password

**Expected Results:**
- ✅ Password reset dialog opens from sign in dialog
- ✅ Email input validates format
- ✅ Success message appears after submission
- ✅ Reset email arrives in inbox
- ✅ Can set new password via Supabase link
- ✅ Can sign in with new password

---

### 6. Session Persistence

**Steps:**
1. Sign in to the app
2. Refresh the browser page
3. Observe user state

**Expected Results:**
- ✅ User remains signed in after refresh
- ✅ UserMenu still shows in toolbar
- ✅ User profile data is still loaded

---

### 7. Dialog Switching

**Steps:**
1. Click "Sign Up" button
2. Click "Already have an account? Sign In" link
3. Click "Don't have an account? Sign Up" link
4. Click "Forgot password?" link

**Expected Results:**
- ✅ Sign Up dialog opens
- ✅ Can switch to Sign In dialog smoothly
- ✅ Can switch back to Sign Up dialog
- ✅ Can open Password Reset dialog from Sign In
- ✅ All previous input is cleared when switching

---

### 8. Validation Testing

**Test Invalid Inputs:**
1. Empty email → "Please fill in all fields"
2. Invalid email format → Browser validation
3. Password < 6 chars → "Password must be at least 6 characters"
4. Passwords don't match → "Passwords do not match"
5. Wrong credentials → "Invalid email or password"

**Expected Results:**
- ✅ All validation errors display correctly
- ✅ Error messages are user-friendly
- ✅ Form prevents submission when invalid

---

### 9. Loading States

**Steps:**
1. Open any auth dialog
2. Submit form
3. Observe UI during async operation

**Expected Results:**
- ✅ Submit button shows loading spinner
- ✅ Button text changes (e.g., "Signing In...")
- ✅ All inputs are disabled during loading
- ✅ Cannot submit form multiple times

---

### 10. Responsive Design

**Steps:**
1. Resize browser window to mobile size (< 640px)
2. Check auth buttons and dialogs

**Expected Results:**
- ✅ Auth buttons show only icons on small screens
- ✅ Dialogs are properly sized for mobile
- ✅ All touch targets are accessible
- ✅ Text is readable at all sizes

---

## Database Verification (Optional)

If you want to verify the backend is working:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/bantewdmfbolztlyvydg
2. Navigate to Table Editor
3. Check `auth.users` table for your user
4. Check `public.profiles` table for profile data
5. Verify `subscription_tier_id` is set to Free tier

---

## Known Limitations (Current Implementation)

1. **No Project Management UI Yet** - "My Projects" menu item doesn't work (coming next)
2. **Tier Name Display** - UserMenu shows hardcoded "Free Plan" (will be dynamic after profile join query)
3. **No Cloud Sync Yet** - Projects still only saved to localStorage (coming next)
4. **No Subscription Management** - No upgrade/downgrade UI (future feature)

---

## Troubleshooting

### Email Not Received
- Check spam/junk folder
- Wait 5 minutes and try again
- Verify Supabase email service is enabled
- Check Supabase logs for email sending errors

### "Invalid email or password" Error
- Verify account is created in Supabase dashboard
- Check if email is verified
- Ensure password is correct (case-sensitive)
- Try password reset if needed

### Session Not Persisting
- Check browser console for errors
- Verify `.env.local` has correct Supabase credentials
- Check if third-party cookies are blocked
- Try clearing browser cache

### TypeScript Errors
- Run `npm install` to ensure all packages installed
- Restart TypeScript server in VS Code
- Check that `tsconfig.app.json` has premium package path mapping

---

## Next Steps After Testing

Once authentication is verified working:

1. ✅ **Cloud Project Storage** - Implement hybrid localStorage + Supabase sync
2. ✅ **Project Management UI** - Build ProjectsDialog for managing cloud projects
3. ✅ **End-to-End Testing** - Test complete save/load workflow
4. ✅ **Production Deployment** - Deploy to Vercel with environment variables

---

## Success Criteria

Authentication integration is considered complete when:

- [x] Users can sign up with email verification
- [x] Users can sign in with verified accounts
- [x] Users can reset forgotten passwords
- [x] Users can sign out
- [x] Session persists across page refreshes
- [x] UserMenu shows correct user info
- [x] All error cases are handled gracefully
- [x] UI is responsive on all screen sizes
- [ ] Cloud project sync works (next phase)
- [ ] RLS policies protect user data (to be tested with cloud sync)

---

**Last Updated:** January 2025  
**Status:** Authentication UI Complete ✅
