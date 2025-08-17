// Simple geohash utilities for demo purposes
// In a real app, you'd use a proper geohash library

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface GeohashBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Simple geohash encoder (basic implementation for demo)
 */
export function encodeGeohash(lat: number, lng: number, precision: number = 6): string {
  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let geohash = '';
  let bits = 0;
  let bit = 0;
  let even = true;

  while (geohash.length < precision) {
    if (even) {
      // Longitude
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (lng >= mid) {
        bit = (bit << 1) | 1;
        lngRange[0] = mid;
      } else {
        bit = bit << 1;
        lngRange[1] = mid;
      }
    } else {
      // Latitude
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        bit = (bit << 1) | 1;
        latRange[0] = mid;
      } else {
        bit = bit << 1;
        latRange[1] = mid;
      }
    }

    even = !even;
    bits++;

    if (bits === 5) {
      geohash += BASE32[bit];
      bits = 0;
      bit = 0;
    }
  }

  return geohash;
}

/**
 * Simple geohash decoder (basic implementation for demo)
 */
export function decodeGeohash(geohash: string): { lat: number; lng: number; bounds: GeohashBounds } {
  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let even = true;

  for (let i = 0; i < geohash.length; i++) {
    const char = geohash[i];
    const cd = BASE32.indexOf(char);
    
    for (let j = 4; j >= 0; j--) {
      const bit = (cd >> j) & 1;
      
      if (even) {
        // Longitude
        const mid = (lngRange[0] + lngRange[1]) / 2;
        if (bit === 1) {
          lngRange[0] = mid;
        } else {
          lngRange[1] = mid;
        }
      } else {
        // Latitude
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bit === 1) {
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }
      
      even = !even;
    }
  }

  const lat = (latRange[0] + latRange[1]) / 2;
  const lng = (lngRange[0] + lngRange[1]) / 2;

  return {
    lat,
    lng,
    bounds: {
      north: latRange[1],
      south: latRange[0],
      east: lngRange[1],
      west: lngRange[0]
    }
  };
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
