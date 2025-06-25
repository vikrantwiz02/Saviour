import { LatLng } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_MAPS_API_KEY } from "@/lib/config";

type NavigationStep = {
  instruction: string;
  distance: string;
  duration: string;
  coordinate: LatLng;
  maneuver?: string;
};

export const getRoute = async (
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[] = []
): Promise<{
  coordinates: LatLng[];
  steps: NavigationStep[];
  distance: string;
  duration: string;
}> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&waypoints=${waypoints
        .map((wp) => `${wp.latitude},${wp.longitude}`)
        .join("|")}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status !== "OK") {
      throw new Error(data.error_message || "Failed to get directions");
    }

    const route = data.routes[0];
    const legs = route.legs[0];
    
    // Extract coordinates for polyline
    const coordinates = route.overview_polyline.points
      .match(/.{1,2}/g)
      .map((pair: string) => {
        const [latitude, longitude] = pair.split(",").map(parseFloat);
        return { latitude, longitude };
      });

    // Extract navigation steps
    const steps: NavigationStep[] = legs.steps.map((step: any) => ({
      instruction: step.html_instructions.replace(/<[^>]*>?/gm, ""),
      distance: step.distance.text,
      duration: step.duration.text,
      coordinate: {
        latitude: step.start_location.lat,
        longitude: step.start_location.lng,
      },
      maneuver: step.maneuver,
    }));

    return {
      coordinates,
      steps,
      distance: legs.distance.text,
      duration: legs.duration.text,
    };
  } catch (error) {
    console.error("Error getting directions:", error);
    throw error;
  }
};

export const calculateDistance = (point1: LatLng, point2: LatLng) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (point2.latitude - point1.latitude) * (Math.PI / 180);
  const dLon = (point2.longitude - point1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.latitude * (Math.PI / 180)) *
      Math.cos(point2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};