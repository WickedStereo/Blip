/**
 * Popular preset room codes for quick join functionality
 * These are actual geohash codes for major cities around the world
 */
export const DEMO_ROOM_CODES = [
  '9q8yy8', // San Francisco
  'dr5ru7', // New York
  'u4prub', // London
  'gcpuv9', // Paris
  'spey8d', // Moscow
  'wx4g6b', // Beijing
  'xn76ur', // Tokyo
  'tey7zk'  // Sydney
];

/**
 * Get a random demo room code for quick join suggestions
 */
export function getRandomDemoRoomCode(): string {
  return DEMO_ROOM_CODES[Math.floor(Math.random() * DEMO_ROOM_CODES.length)];
}