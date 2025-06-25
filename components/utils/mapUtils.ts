/**
 * Geographic coordinate point
 */
export type Location = {
  latitude: number;
  longitude: number;
};

/**
 * Route step with navigation instructions
 */
export type RouteStep = {
  instruction: string;
  distance: string;
  duration: string;
  startLocation: Location;
  endLocation: Location;
};

/**
 * Decodes a Google Maps polyline string into an array of coordinates
 * @param encoded - The encoded polyline string
 * @returns Array of Location objects
 */
export function decodePolyline(encoded: string): Location[] {
  if (!encoded) return [];
  
  const points: Location[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    
    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return points;
}

/**
 * Calculates distance between two points in kilometers
 * Uses Haversine formula for great-circle distance
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) * 
    Math.cos(toRad(point2.latitude)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts numeric degrees to radians
 */
function toRad(value: number): number {
  return value * Math.PI / 180;
}

/**
 * Formats distance for display (km or m)
 */
export function formatDistance(distance: number): string {
  if (distance >= 1) {
    return `${distance.toFixed(1)} km`;
  }
  return `${Math.round(distance * 1000)} m`;
}

/**
 * Calculates bearing between two points in degrees
 * Useful for determining direction of travel
 */
export function calculateBearing(start: Location, end: Location): number {
  const startLat = toRad(start.latitude);
  const startLng = toRad(start.longitude);
  const endLat = toRad(end.latitude);
  const endLng = toRad(end.longitude);

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
            Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
            
  let bearing = Math.atan2(y, x);
  bearing = toDeg(bearing);
  return (bearing + 360) % 360;
}

function toDeg(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Gets compass direction from bearing in degrees
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Simplifies route instructions by removing HTML tags and extra spaces
 */
export function cleanInstruction(instruction: string): string {
  if (!instruction) return '';
  
  // Remove HTML tags
  let cleaned = instruction.replace(/<[^>]+>/g, '');
  
  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Replace special characters
  cleaned = cleaned.replace(/&nbsp;/g, ' ')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>');
  
  return cleaned;
}

/**
 * Extracts route steps from Google Directions API response
 */
export function parseRouteSteps(leg: any): RouteStep[] {
  if (!leg || !leg.steps) return [];
  
  return leg.steps.map((step: any) => ({
    instruction: cleanInstruction(step.html_instructions),
    distance: step.distance.text,
    duration: step.duration.text,
    startLocation: {
      latitude: step.start_location.lat,
      longitude: step.start_location.lng
    },
    endLocation: {
      latitude: step.end_location.lat,
      longitude: step.end_location.lng
    }
  }));
}

/**
 * Finds the closest point on a route to a given location
 */
export function findClosestRoutePoint(routePoints: Location[], location: Location): {
  index: number;
  point: Location;
  distance: number;
} {
  let closestIndex = 0;
  let closestDistance = Infinity;
  
  routePoints.forEach((point, index) => {
    const distance = calculateDistance(point, location);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  
  return {
    index: closestIndex,
    point: routePoints[closestIndex],
    distance: closestDistance
  };
}

/**
 * Calculates ETA based on route steps
 */
export function calculateETA(steps: RouteStep[]): string {
  if (!steps || steps.length === 0) return '0 min';
  
  const totalSeconds = steps.reduce((sum, step) => {
    const timeStr = step.duration;
    if (timeStr.includes('min')) {
      return sum + parseInt(timeStr) * 60;
    } else if (timeStr.includes('hour')) {
      return sum + parseInt(timeStr) * 3600;
    }
    return sum + parseInt(timeStr);
  }, 0);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

/**
 * Gets the current step index based on user location
 */
export function getCurrentStepIndex(
  userLocation: Location,
  steps: RouteStep[],
  routePoints: Location[]
): number {
  if (!steps.length || !routePoints.length) return 0;
  
  const closest = findClosestRoutePoint(routePoints, userLocation);
  
  // Find which step this point belongs to
  for (let i = 0; i < steps.length; i++) {
    const stepStart = findClosestRoutePoint(routePoints, steps[i].startLocation);
    const stepEnd = findClosestRoutePoint(routePoints, steps[i].endLocation);
    
    if (closest.index >= stepStart.index && closest.index <= stepEnd.index) {
      return i;
    }
  }
  
  return 0;
}