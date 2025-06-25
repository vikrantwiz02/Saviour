import { getAuth } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, onSnapshot, Unsubscribe, getFirestore } from "firebase/firestore";
import { UserProfile } from "../Map/types";
import { registerForPushNotifications } from "./notifications";

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const db = getFirestore();
    const profileRef = doc(db, "users", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return profileSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const updateUserProfile = async (updates: Partial<UserProfile>) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    const profileRef = doc(db, "users", user.uid);

    // Get FCM token for push notifications
    const token = await registerForPushNotifications();

    await setDoc(profileRef, {
      uid: user.uid,
      name: user.displayName || "User",
      email: user.email || "",
      fcmToken: token,
      ...updates,
    }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
};

export const listenToUserProfile = (
  userId: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe => {
  const db = getFirestore();
  const profileRef = doc(db, "users", userId);
  
  return onSnapshot(profileRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserProfile);
    } else {
      callback(null);
    }
  });
};