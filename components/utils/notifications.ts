import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { SOSRequest } from "../Map/types";

// Register for push notifications and get FCM token
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    // Request permissions on iOS
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("Push notification permission not granted");
      return null;
    }

    // Get the device FCM token
    const token = await messaging().getToken();
    console.log("FCM token:", token);
    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
};

/**
 * Send an SOS notification to all responders.
 * This function calls your backend API, which must use the FCM Admin SDK to send notifications.
 * @param sos The SOSRequest object
 */
export const sendSOSNotification = async (sos: SOSRequest) => {
  try {
    const db = getFirestore();

    // Find responders with FCM tokens
    const respondersQuery = query(
      collection(db, "users"),
      where("role", "==", "responder"),
      where("fcmToken", "!=", null)
    );
    const respondersSnap = await getDocs(respondersQuery);
    const tokens = respondersSnap.docs
      .map(doc => doc.data().fcmToken)
      .filter(token => token);

    if (tokens.length === 0) {
      console.log("No responders with FCM tokens found.");
      return;
    }

    // Call your backend API to send the notification
    // Replace the URL below with your actual backend endpoint
    const response = await fetch("https://your-backend.example.com/send-sos-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens,
        title: "New Emergency Alert!",
        body: `${sos.emergencyType} - ${sos.urgency} priority`,
        data: { sosId: sos.id },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }

    console.log("Sent notifications to", tokens.length, "responders");
  } catch (error) {
    console.error("Error sending SOS notification:", error);
  }
};