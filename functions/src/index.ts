import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Callable function to send notifications
export const sendSOSNotification = functions.https.onCall(
  async (data: any, context: any) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Only authenticated users can send notifications"
      );
    }

    const { tokens, title, body, sosId } = data;

    if (
      !tokens ||
      !Array.isArray(tokens) ||
      tokens.length === 0 ||
      !title ||
      !body ||
      !sosId
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      const message = {
        notification: { title, body },
        data: { sosId },
        tokens: tokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error("Error sending notifications:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send notifications"
      );
    }
  }
);