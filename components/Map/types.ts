import { Timestamp } from "firebase/firestore";
import { LatLng } from "react-native-maps";

export type EmergencyType = 
  | 'Medical Emergency'
  | 'Fire Outbreak'
  | 'Armed Robbery'
  | 'Car Accident'
  | 'Domestic Violence'
  | 'Natural Disaster'
  | 'Missing Person'
  | 'Public Disturbance'
  | 'Other';

export type UrgencyLevel = "High" | "Medium" | "Low";

export type SOSRequest = {
  id: string;
  userId: string;
  location: LatLng;
  emergencyType: EmergencyType;
  description: string;
  urgency: UrgencyLevel;
  createdAt: Timestamp;
  isPublic: boolean;
  senderName?: string;
  senderContact?: string;
  status: 'active' | 'responded' | 'resolved';
  responderId?: string;
};

export type UserProfile = {
  uid: string;
  role: "user" | "responder" | "admin";
  name: string;
  email: string;
  phone?: string;
  serviceRadius?: number; // in km, for responders
  fcmToken?: string;
  createdAt: Timestamp;
};

export type MapFilter = {
  urgency?: UrgencyLevel[];
  type?: EmergencyType[];
  radius?: number;
  showPublicOnly?: boolean;
  showActiveOnly?: boolean;
};

export type NavigationStep = {
  instruction: string;
  distance: string;
  duration: string;
  coordinate: LatLng;
  maneuver?: string;
};

export type ChatMessage = {
  id: string;
  sosId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp;
  isSystemMessage?: boolean;
};