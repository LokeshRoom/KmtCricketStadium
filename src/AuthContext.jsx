import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, createUserWithEmailAndPassword, getIdToken, onAuthStateChanged, reload, sendEmailVerification, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, adminEmails } from './firebase';
import { claimGuestRegistrations } from './store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) { setUser(null); setLoading(false); return; }
    const current = {
      uid: firebaseUser.uid,
      email: (firebaseUser.email || '').toLowerCase(),
      displayName: firebaseUser.displayName || firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      isAdmin: firebaseUser.emailVerified && adminEmails.includes((firebaseUser.email || '').toLowerCase()),
      firebaseUser,
    };
    setUser(current);
    setLoading(false);
    if (firebaseUser.emailVerified) claimGuestRegistrations(firebaseUser).catch((error) => console.error('Registration claim failed', error));
  }), []);

  const signInEmail = useCallback((email, password) => signInWithEmailAndPassword(auth, email.trim(), password), []);
  const registerEmail = useCallback(async (email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await sendEmailVerification(credential.user);
    return credential;
  }, []);
  const signInGoogle = useCallback(() => signInWithPopup(auth, new GoogleAuthProvider()), []);
  const resendVerification = useCallback(() => user?.firebaseUser ? sendEmailVerification(user.firebaseUser) : Promise.resolve(), [user]);
  const refreshVerification = useCallback(async () => {
    if (!user?.firebaseUser) return;
    await reload(user.firebaseUser);
    await getIdToken(user.firebaseUser, true);
    const firebaseUser = auth.currentUser;
    const current = { ...user, emailVerified: firebaseUser.emailVerified, isAdmin: firebaseUser.emailVerified && adminEmails.includes((firebaseUser.email || '').toLowerCase()), firebaseUser };
    setUser(current);
    if (firebaseUser.emailVerified) await claimGuestRegistrations(firebaseUser);
  }, [user]);
  const signOutUser = useCallback(() => signOut(auth), []);

  const value = useMemo(() => ({ user, loading, signInEmail, registerEmail, signInGoogle, resendVerification, refreshVerification, signOut: signOutUser }), [user, loading, signInEmail, registerEmail, signInGoogle, resendVerification, refreshVerification, signOutUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
