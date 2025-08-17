import { decodeGeohash, encodeGeohash, GeohashBounds } from './geohash';

export interface GeohashCell {
  geohash: string;
  bounds: GeohashBounds;
  center: { lat: number; lng: number };
  level: number;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Calculate appropriate geohash precision based on zoom level
 */
export function getGeohashPrecisionForZoom(zoom: number): number {
  // More conservative precision mapping to avoid too many small regions
  if (zoom <= 4) return 2;
  if (zoom <= 6) return 3;
  if (zoom <= 8) return 4;
  if (zoom <= 10) return 5;
  if (zoom <= 12) return 6;
  if (zoom <= 14) return 6; // Keep at 6 for most detailed view
  return 6; // Max precision of 6 for room-level accuracy
}

/**
 * Get all geohash cells visible in the current viewport
 */
export function getVisibleGeohashCells(
  viewport: ViewportBounds,
  zoom: number,
  maxCells: number = 50
): GeohashCell[] {
  const precision = getGeohashPrecisionForZoom(zoom);
  const processedHashes = new Set<string>();
  const cells: GeohashCell[] = [];
  
  // Calculate grid size based on precision to avoid duplicates
  const gridSize = Math.ceil(Math.sqrt(maxCells));
  const latStep = (viewport.north - viewport.south) / gridSize;
  const lngStep = (viewport.east - viewport.west) / gridSize;
  
  // Generate sample points and get unique geohashes
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const lat = viewport.south + (i * latStep);
      const lng = viewport.west + (j * lngStep);
      
      // Skip if outside viewport bounds
      if (lat > viewport.north || lng > viewport.east) continue;
      
      const geohash = encodeGeohash(lat, lng, precision);
      
      if (!processedHashes.has(geohash)) {
        processedHashes.add(geohash);
        const decoded = decodeGeohash(geohash);
        
        // Only include if the geohash cell actually intersects the viewport
        if (isGeohashInViewport(geohash, viewport)) {
          cells.push({
            geohash,
            bounds: decoded.bounds,
            center: { lat: decoded.lat, lng: decoded.lng },
            level: precision
          });
          
          if (cells.length >= maxCells) {
            break;
          }
        }
      }
    }
    if (cells.length >= maxCells) {
      break;
    }
  }
  
  return cells;
}

/**
 * Get neighboring geohashes for a given geohash
 */
export function getNeighboringGeohashes(geohash: string): string[] {
  const neighbors: string[] = [];
  const decoded = decodeGeohash(geohash);
  const precision = geohash.length;
  
  // Calculate approximate step size for this precision
  const latStep = (decoded.bounds.north - decoded.bounds.south);
  const lngStep = (decoded.bounds.east - decoded.bounds.west);
  
  // Generate 8 neighboring cells
  const offsets = [
    [-latStep, -lngStep], [-latStep, 0], [-latStep, lngStep],
    [0, -lngStep],                       [0, lngStep],
    [latStep, -lngStep],  [latStep, 0],  [latStep, lngStep]
  ];
  
  for (const [latOffset, lngOffset] of offsets) {
    const neighborGeohash = encodeGeohash(
      decoded.lat + latOffset,
      decoded.lng + lngOffset,
      precision
    );
    
    if (neighborGeohash !== geohash) {
      neighbors.push(neighborGeohash);
    }
  }
  
  return neighbors;
}

/**
 * Check if a geohash cell intersects with the viewport
 */
export function isGeohashInViewport(geohash: string, viewport: ViewportBounds): boolean {
  const decoded = decodeGeohash(geohash);
  const bounds = decoded.bounds;
  
  return !(
    bounds.south > viewport.north ||
    bounds.north < viewport.south ||
    bounds.west > viewport.east ||
    bounds.east < viewport.west
  );
}

/**
 * Get geohash cells at different levels for progressive loading
 */
export function getGeohashHierarchy(
  viewport: ViewportBounds,
  zoom: number
): { [level: number]: GeohashCell[] } {
  const maxPrecision = getGeohashPrecisionForZoom(zoom);
  const hierarchy: { [level: number]: GeohashCell[] } = {};
  
  // Start with lower precision for overview
  for (let precision = Math.max(1, maxPrecision - 2); precision <= maxPrecision; precision++) {
    const maxCellsForLevel = precision === maxPrecision ? 100 : 25;
    
    // Create a temporary viewport calculation for this precision
    const cells = getVisibleGeohashCells(viewport, zoom, maxCellsForLevel);
    
    hierarchy[precision] = cells.filter(cell => cell.level === precision);
  }
  
  return hierarchy;
}

/**
 * Calculate the area of a geohash cell in square meters
 */
export function getGeohashAreaM2(geohash: string): number {
  const decoded = decodeGeohash(geohash);
  const bounds = decoded.bounds;
  
  // Approximate calculation using lat/lng differences
  // More accurate for smaller areas
  const latDiff = bounds.north - bounds.south;
  const lngDiff = bounds.east - bounds.west;
  
  // Convert degrees to meters (rough approximation)
  const latMeters = latDiff * 111320; // 1 degree lat ≈ 111.32 km
  const lngMeters = lngDiff * 111320 * Math.cos(decoded.lat * Math.PI / 180);
  
  return latMeters * lngMeters;
}

/**
 * Format geohash for display (6 characters max)
 */
export function formatGeohashForDisplay(geohash: string): string {
  return geohash.substring(0, 6).toUpperCase();
}

/**
 * Get optimal geohash precision for room density
 */
export function getOptimalPrecisionForDensity(
  roomCount: number,
  areaKm2: number
): number {
  // Higher density areas need more precision
  const density = roomCount / areaKm2;
  
  if (density > 100) return 8;
  if (density > 50) return 7;
  if (density > 20) return 6;
  if (density > 10) return 5;
  if (density > 5) return 4;
  return 3;
}

/**
 * Debounced function utility for map interactions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttled function utility for smooth map interactions
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
