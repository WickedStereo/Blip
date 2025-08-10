// Simple ngeohash implementation for Blip
// Based on the original ngeohash algorithm

(function(global) {
    'use strict';

    const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    const BASE32_MAP = {};
    
    for (let i = 0; i < BASE32.length; i++) {
        BASE32_MAP[BASE32[i]] = i;
    }

    // Encode latitude and longitude to geohash
    function encode(latitude, longitude, precision = 5) {
        let latRange = [-90.0, 90.0];
        let lonRange = [-180.0, 180.0];
        let geohash = '';
        let bits = 0;
        let bit = 0;
        let ch = 0;
        let even = true;

        while (geohash.length < precision) {
            if (even) {
                // longitude
                const mid = (lonRange[0] + lonRange[1]) / 2;
                if (longitude > mid) {
                    ch |= (1 << (4 - bit));
                    lonRange[0] = mid;
                } else {
                    lonRange[1] = mid;
                }
            } else {
                // latitude
                const mid = (latRange[0] + latRange[1]) / 2;
                if (latitude > mid) {
                    ch |= (1 << (4 - bit));
                    latRange[0] = mid;
                } else {
                    latRange[1] = mid;
                }
            }

            even = !even;
            if (bit < 4) {
                bit++;
            } else {
                geohash += BASE32[ch];
                bit = 0;
                ch = 0;
            }
        }

        return geohash;
    }

    // Decode geohash to latitude and longitude
    function decode(geohash) {
        let latRange = [-90.0, 90.0];
        let lonRange = [-180.0, 180.0];
        let even = true;

        for (let i = 0; i < geohash.length; i++) {
            const cd = BASE32_MAP[geohash[i]];
            for (let j = 4; j >= 0; j--) {
                const bit = (cd >> j) & 1;
                if (even) {
                    // longitude
                    const mid = (lonRange[0] + lonRange[1]) / 2;
                    if (bit === 1) {
                        lonRange[0] = mid;
                    } else {
                        lonRange[1] = mid;
                    }
                } else {
                    // latitude
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

        return {
            latitude: (latRange[0] + latRange[1]) / 2,
            longitude: (lonRange[0] + lonRange[1]) / 2
        };
    }

    // Get neighboring geohashes within a bounding box for radius search
    function bboxes(lat, lon, radiusMeters, precision = 6) {
        // Calculate approximate degree distance for the radius
        const latDelta = radiusMeters / 111320; // meters per degree latitude
        const lonDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)); // meters per degree longitude

        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLon = lon - lonDelta;
        const maxLon = lon + lonDelta;

        // Generate a grid of geohashes covering the bounding box
        const geohashes = new Set();
        
        // Sample points within the bounding box
        const steps = Math.max(3, Math.ceil(radiusMeters / 1000)); // More steps for larger radius
        const latStep = (maxLat - minLat) / steps;
        const lonStep = (maxLon - minLon) / steps;

        for (let i = 0; i <= steps; i++) {
            for (let j = 0; j <= steps; j++) {
                const sampleLat = minLat + i * latStep;
                const sampleLon = minLon + j * lonStep;
                
                // Check if the point is within the circular radius
                const distance = calculateDistance(lat, lon, sampleLat, sampleLon);
                if (distance <= radiusMeters) {
                    const geohash = encode(sampleLat, sampleLon, precision);
                    geohashes.add(geohash);
                }
            }
        }

        return Array.from(geohashes);
    }

    // Calculate distance between two points using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Expose the API
    const ngeohash = {
        encode: encode,
        decode: decode,
        bboxes: bboxes
    };

    // Support different module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ngeohash;
    } else if (typeof define === 'function' && define.amd) {
        define(function() { return ngeohash; });
    } else {
        global.ngeohash = ngeohash;
    }

})(typeof window !== 'undefined' ? window : this);