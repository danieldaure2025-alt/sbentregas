/**
 * Route Optimization Engine
 * 
 * Handles intelligent order grouping, en-route suggestion scoring,
 * insertion cost calculation, and delivery sequence optimization.
 */

import { prisma } from './db';
import { haversineDistance } from './geo-utils';

// ============================================================
// Types
// ============================================================

export interface RoutingConfig {
    maxGroupingDistanceKm: number;
    maxDetourDistanceKm: number;
    maxAdditionalTimeMin: number;
    maxOrdersPerRoute: number;
    bearingToleranceDeg: number;
    enabled: boolean;
    avgSpeedKmh: number;
    avgDeliveryTimeMin: number;
}

export interface OrderLocation {
    id: string;
    originAddress: string;
    originLatitude: number;
    originLongitude: number;
    destinationAddress: string;
    destinationLatitude: number;
    destinationLongitude: number;
    price: number;
    distance: number;
    createdAt: Date;
}

export interface DriverState {
    id: string;
    latitude: number;
    longitude: number;
    activeOrderIds: string[];
    activeOrders: OrderLocation[];
}

export interface RouteSuggestion {
    orderId: string;
    originAddress: string;
    destinationAddress: string;
    price: number;
    additionalDistanceKm: number;
    additionalTimeMin: number;
    detourKm: number;
    score: number; // 0-100
}

export interface OrderGroup {
    orderIds: string[];
    centroidLat: number;
    centroidLng: number;
    totalDistance: number;
    estimatedTimeMin: number;
}

// ============================================================
// Config Loader
// ============================================================

const ROUTING_CONFIG_KEYS: Record<string, { key: string; default: number | boolean }> = {
    maxGroupingDistanceKm: { key: 'ROUTING_MAX_GROUPING_DISTANCE_KM', default: 3 },
    maxDetourDistanceKm: { key: 'ROUTING_MAX_DETOUR_DISTANCE_KM', default: 2 },
    maxAdditionalTimeMin: { key: 'ROUTING_MAX_ADDITIONAL_TIME_MIN', default: 10 },
    maxOrdersPerRoute: { key: 'ROUTING_MAX_ORDERS_PER_ROUTE', default: 5 },
    bearingToleranceDeg: { key: 'ROUTING_BEARING_TOLERANCE_DEG', default: 45 },
    enabled: { key: 'ROUTING_ENABLED', default: true },
    avgSpeedKmh: { key: 'ROUTING_AVG_SPEED_KMH', default: 30 },
    avgDeliveryTimeMin: { key: 'ROUTING_AVG_DELIVERY_TIME_MIN', default: 5 },
};

export async function loadRoutingConfig(): Promise<RoutingConfig> {
    try {
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: { in: Object.values(ROUTING_CONFIG_KEYS).map((v) => v.key) },
            },
        });

        const configMap = new Map(configs.map((c) => [c.key, c.value]));

        return {
            maxGroupingDistanceKm: parseFloat(configMap.get('ROUTING_MAX_GROUPING_DISTANCE_KM') || '3'),
            maxDetourDistanceKm: parseFloat(configMap.get('ROUTING_MAX_DETOUR_DISTANCE_KM') || '2'),
            maxAdditionalTimeMin: parseFloat(configMap.get('ROUTING_MAX_ADDITIONAL_TIME_MIN') || '10'),
            maxOrdersPerRoute: parseInt(configMap.get('ROUTING_MAX_ORDERS_PER_ROUTE') || '5', 10),
            bearingToleranceDeg: parseFloat(configMap.get('ROUTING_BEARING_TOLERANCE_DEG') || '45'),
            enabled: (configMap.get('ROUTING_ENABLED') || 'true') === 'true',
            avgSpeedKmh: parseFloat(configMap.get('ROUTING_AVG_SPEED_KMH') || '30'),
            avgDeliveryTimeMin: parseFloat(configMap.get('ROUTING_AVG_DELIVERY_TIME_MIN') || '5'),
        };
    } catch (error) {
        console.error('[RouteEngine] Error loading config, using defaults:', error);
        return {
            maxGroupingDistanceKm: 3,
            maxDetourDistanceKm: 2,
            maxAdditionalTimeMin: 10,
            maxOrdersPerRoute: 5,
            bearingToleranceDeg: 45,
            enabled: true,
            avgSpeedKmh: 30,
            avgDeliveryTimeMin: 5,
        };
    }
}

// ============================================================
// Geo Calculations
// ============================================================

/**
 * Calculate bearing (direction in degrees) from point A to point B
 * Returns 0-360 where 0=north, 90=east, 180=south, 270=west
 */
export function calculateBearing(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    const bearing = Math.atan2(y, x);
    return (toDeg(bearing) + 360) % 360;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

function toDeg(rad: number): number {
    return rad * (180 / Math.PI);
}

/**
 * Calculate angular difference between two bearings
 * Returns 0-180 (smallest angle between them)
 */
export function bearingDifference(bearing1: number, bearing2: number): number {
    let diff = Math.abs(bearing1 - bearing2);
    if (diff > 180) diff = 360 - diff;
    return diff;
}

/**
 * Check if a candidate point is roughly along the route from driver to destination
 * Uses perpendicular distance from the candidate to the line of travel
 */
export function isAlongRoute(
    driverLat: number, driverLng: number,
    destLat: number, destLng: number,
    candidateLat: number, candidateLng: number,
    maxDetourKm: number
): boolean {
    // Calculate bearings
    const bearingToDestination = calculateBearing(driverLat, driverLng, destLat, destLng);
    const bearingToCandidate = calculateBearing(driverLat, driverLng, candidateLat, candidateLng);

    // Angular difference
    const angleDiff = bearingDifference(bearingToDestination, bearingToCandidate);

    // If candidate is more than 90° off course, it's not along the route
    if (angleDiff > 90) return false;

    // Calculate perpendicular distance from candidate to the line of travel
    const distToCandidate = haversineDistance(driverLat, driverLng, candidateLat, candidateLng);
    const perpendicularDistance = distToCandidate * Math.sin(toRad(angleDiff));

    return Math.abs(perpendicularDistance) <= maxDetourKm;
}

/**
 * Estimate travel time between two points
 */
export function estimateTravelTimeMin(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
    avgSpeedKmh: number = 30
): number {
    const distKm = haversineDistance(lat1, lon1, lat2, lon2);
    return (distKm / avgSpeedKmh) * 60;
}

// ============================================================
// Order Grouping
// ============================================================

/**
 * Group nearby pending orders by destination proximity and bearing direction.
 * Uses a simple greedy clustering approach.
 */
export function groupNearbyOrders(
    orders: OrderLocation[],
    config: RoutingConfig
): OrderGroup[] {
    if (orders.length === 0) return [];

    const assigned = new Set<string>();
    const groups: OrderGroup[] = [];

    // Sort by creation time (FIFO priority)
    const sorted = [...orders].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    for (const anchor of sorted) {
        if (assigned.has(anchor.id)) continue;

        const group: OrderLocation[] = [anchor];
        assigned.add(anchor.id);

        // Find nearby orders in the same direction
        for (const candidate of sorted) {
            if (assigned.has(candidate.id)) continue;
            if (group.length >= config.maxOrdersPerRoute) break;

            // Check destination proximity
            const destDistance = haversineDistance(
                anchor.destinationLatitude,
                anchor.destinationLongitude,
                candidate.destinationLatitude,
                candidate.destinationLongitude
            );

            if (destDistance > config.maxGroupingDistanceKm) continue;

            // Check origin proximity (pickups should also be close)
            const originDistance = haversineDistance(
                anchor.originLatitude,
                anchor.originLongitude,
                candidate.originLatitude,
                candidate.originLongitude
            );

            if (originDistance > config.maxGroupingDistanceKm * 2) continue;

            // Check bearing similarity (from origin to destination)
            const anchorBearing = calculateBearing(
                anchor.originLatitude, anchor.originLongitude,
                anchor.destinationLatitude, anchor.destinationLongitude
            );
            const candidateBearing = calculateBearing(
                candidate.originLatitude, candidate.originLongitude,
                candidate.destinationLatitude, candidate.destinationLongitude
            );

            if (bearingDifference(anchorBearing, candidateBearing) > config.bearingToleranceDeg) {
                continue;
            }

            group.push(candidate);
            assigned.add(candidate.id);
        }

        // Calculate centroid and estimated metrics
        const centroidLat = group.reduce((s, o) => s + o.destinationLatitude, 0) / group.length;
        const centroidLng = group.reduce((s, o) => s + o.destinationLongitude, 0) / group.length;

        // Rough total distance: sum of individual + inter-delivery
        let totalDist = 0;
        for (let i = 0; i < group.length; i++) {
            totalDist += group[i].distance;
            if (i > 0) {
                totalDist += haversineDistance(
                    group[i - 1].destinationLatitude, group[i - 1].destinationLongitude,
                    group[i].destinationLatitude, group[i].destinationLongitude
                );
            }
        }

        const travelTimeMin = (totalDist / config.avgSpeedKmh) * 60;
        const deliveryTimeMin = group.length * config.avgDeliveryTimeMin;

        groups.push({
            orderIds: group.map((o) => o.id),
            centroidLat,
            centroidLng,
            totalDistance: Math.round(totalDist * 10) / 10,
            estimatedTimeMin: Math.ceil(travelTimeMin + deliveryTimeMin),
        });
    }

    return groups;
}

// ============================================================
// En-Route Suggestion Engine
// ============================================================

/**
 * Find pending orders that can be suggested to a driver who is currently en route.
 * Evaluates detour distance, bearing alignment, time impact, and capacity.
 */
export function findEnRouteOrders(
    driver: DriverState,
    pendingOrders: OrderLocation[],
    config: RoutingConfig
): RouteSuggestion[] {
    if (!config.enabled || pendingOrders.length === 0) return [];

    // Current capacity check
    if (driver.activeOrderIds.length >= config.maxOrdersPerRoute) return [];

    // Determine driver's current destination (next delivery point)
    const nextDestination = driver.activeOrders[0];
    if (!nextDestination) return [];

    const suggestions: RouteSuggestion[] = [];

    for (const order of pendingOrders) {
        // Skip if order has no coordinates
        if (!order.originLatitude || !order.originLongitude ||
            !order.destinationLatitude || !order.destinationLongitude) {
            continue;
        }

        // 1. Check if pickup is along the route
        const pickupAlongRoute = isAlongRoute(
            driver.latitude, driver.longitude,
            nextDestination.destinationLatitude, nextDestination.destinationLongitude,
            order.originLatitude, order.originLongitude,
            config.maxDetourDistanceKm
        );

        if (!pickupAlongRoute) continue;

        // 2. Check if destination is also within reasonable range
        const destDistance = haversineDistance(
            nextDestination.destinationLatitude, nextDestination.destinationLongitude,
            order.destinationLatitude, order.destinationLongitude
        );

        if (destDistance > config.maxGroupingDistanceKm) continue;

        // 3. Calculate insertion cost
        const { additionalDistanceKm, additionalTimeMin, detourKm } = calculateInsertionCost(
            driver,
            order,
            config
        );

        // 4. Check constraints
        if (additionalDistanceKm > config.maxDetourDistanceKm * 2) continue;
        if (additionalTimeMin > config.maxAdditionalTimeMin) continue;

        // 5. Score the suggestion (0-100)
        const score = calculateSuggestionScore(
            additionalDistanceKm,
            additionalTimeMin,
            detourKm,
            order.price,
            config
        );

        suggestions.push({
            orderId: order.id,
            originAddress: order.originAddress,
            destinationAddress: order.destinationAddress,
            price: order.price,
            additionalDistanceKm: Math.round(additionalDistanceKm * 10) / 10,
            additionalTimeMin: Math.ceil(additionalTimeMin),
            detourKm: Math.round(detourKm * 10) / 10,
            score,
        });
    }

    // Sort by score descending
    return suggestions.sort((a, b) => b.score - a.score);
}

// ============================================================
// Insertion Cost Calculator
// ============================================================

/**
 * Calculate extra distance and time if a new order is inserted into the current route.
 */
export function calculateInsertionCost(
    driver: DriverState,
    newOrder: OrderLocation,
    config: RoutingConfig
): { additionalDistanceKm: number; additionalTimeMin: number; detourKm: number } {
    // Direct distance from driver to current next destination
    const nextDest = driver.activeOrders[0];
    if (!nextDest) {
        return { additionalDistanceKm: 0, additionalTimeMin: 0, detourKm: 0 };
    }

    const directDistance = haversineDistance(
        driver.latitude, driver.longitude,
        nextDest.destinationLatitude, nextDest.destinationLongitude
    );

    // Distance via new order: driver → new pickup → new destination → original destination
    const driverToPickup = haversineDistance(
        driver.latitude, driver.longitude,
        newOrder.originLatitude, newOrder.originLongitude
    );
    const pickupToNewDest = haversineDistance(
        newOrder.originLatitude, newOrder.originLongitude,
        newOrder.destinationLatitude, newOrder.destinationLongitude
    );
    const newDestToOrigDest = haversineDistance(
        newOrder.destinationLatitude, newOrder.destinationLongitude,
        nextDest.destinationLatitude, nextDest.destinationLongitude
    );

    const detourDistance = driverToPickup + pickupToNewDest + newDestToOrigDest;
    const additionalDistanceKm = detourDistance - directDistance;
    const detourKm = driverToPickup - haversineDistance(
        driver.latitude, driver.longitude,
        newOrder.originLatitude, newOrder.originLongitude
    );

    const travelTimeMin = (additionalDistanceKm / config.avgSpeedKmh) * 60;
    const additionalTimeMin = travelTimeMin + config.avgDeliveryTimeMin;

    return {
        additionalDistanceKm: Math.max(0, additionalDistanceKm),
        additionalTimeMin: Math.max(0, additionalTimeMin),
        detourKm: Math.max(0, Math.abs(detourKm)),
    };
}

// ============================================================
// Scoring
// ============================================================

/**
 * Calculate efficiency score for a route suggestion.
 * Higher score = better suggestion.
 * Factors: detour penalty, time penalty, price bonus
 */
function calculateSuggestionScore(
    additionalDistanceKm: number,
    additionalTimeMin: number,
    detourKm: number,
    price: number,
    config: RoutingConfig
): number {
    // Start with base score
    let score = 100;

    // Detour penalty: -20 points per km of detour
    score -= (detourKm / config.maxDetourDistanceKm) * 30;

    // Time penalty: -15 points per extra minute (relative to max)
    score -= (additionalTimeMin / config.maxAdditionalTimeMin) * 25;

    // Distance penalty
    score -= (additionalDistanceKm / (config.maxDetourDistanceKm * 2)) * 15;

    // Price bonus: higher price orders get a boost
    const priceBonus = Math.min(price / 20, 15); // max 15 points
    score += priceBonus;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================
// Sequence Optimization (Enhanced Nearest Neighbor + 2-opt)
// ============================================================

/**
 * Optimize delivery sequence using nearest-neighbor then 2-opt improvement.
 */
export function optimizeDeliverySequence(
    orders: OrderLocation[],
    startLat: number,
    startLng: number
): { orderedIds: string[]; totalDistance: number; estimatedTimeMin: number } {
    if (orders.length === 0) {
        return { orderedIds: [], totalDistance: 0, estimatedTimeMin: 0 };
    }

    if (orders.length === 1) {
        return {
            orderedIds: [orders[0].id],
            totalDistance: orders[0].distance,
            estimatedTimeMin: Math.ceil((orders[0].distance / 30) * 60) + 5,
        };
    }

    // Step 1: Nearest Neighbor
    const remaining = [...orders];
    const route: OrderLocation[] = [];
    let currentLat = startLat;
    let currentLng = startLng;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const d = haversineDistance(
                currentLat, currentLng,
                remaining[i].destinationLatitude, remaining[i].destinationLongitude
            );
            if (d < nearestDist) {
                nearestDist = d;
                nearestIdx = i;
            }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0];
        route.push(nearest);
        currentLat = nearest.destinationLatitude;
        currentLng = nearest.destinationLongitude;
    }

    // Step 2: 2-opt improvement
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < route.length - 1; i++) {
            for (let j = i + 1; j < route.length; j++) {
                const currentCost = routeSegmentCost(route, i, j, startLat, startLng);
                // Reverse the segment [i+1 ... j]
                const newRoute = [...route];
                const segment = newRoute.splice(i + 1, j - i);
                segment.reverse();
                newRoute.splice(i + 1, 0, ...segment);

                const newCost = routeSegmentCost(newRoute, i, j, startLat, startLng);
                if (newCost < currentCost) {
                    route.splice(0, route.length, ...newRoute);
                    improved = true;
                }
            }
        }
    }

    // Calculate total distance
    let totalDistance = 0;
    let prevLat = startLat;
    let prevLng = startLng;
    for (const order of route) {
        totalDistance += haversineDistance(prevLat, prevLng, order.destinationLatitude, order.destinationLongitude);
        prevLat = order.destinationLatitude;
        prevLng = order.destinationLongitude;
    }

    const travelTimeMin = (totalDistance / 30) * 60;
    const deliveryTimeMin = route.length * 5;

    return {
        orderedIds: route.map((o) => o.id),
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedTimeMin: Math.ceil(travelTimeMin + deliveryTimeMin),
    };
}

/**
 * Calculate cost of a route segment for 2-opt comparison
 */
function routeSegmentCost(
    route: OrderLocation[],
    i: number,
    j: number,
    startLat: number,
    startLng: number
): number {
    let cost = 0;
    for (let k = i; k <= j; k++) {
        const prevLat = k === 0 ? startLat : route[k - 1].destinationLatitude;
        const prevLng = k === 0 ? startLng : route[k - 1].destinationLongitude;
        cost += haversineDistance(prevLat, prevLng, route[k].destinationLatitude, route[k].destinationLongitude);
    }
    if (j + 1 < route.length) {
        cost += haversineDistance(
            route[j].destinationLatitude, route[j].destinationLongitude,
            route[j + 1].destinationLatitude, route[j + 1].destinationLongitude
        );
    }
    return cost;
}

// ============================================================
// Route Efficiency Score
// ============================================================

/**
 * Calculate overall efficiency score for a route group
 */
export function calculateRouteEfficiency(
    orders: OrderLocation[],
    totalDistance: number
): number {
    if (orders.length === 0) return 0;

    // Sum of individual order distances (if delivered separately)
    const individualTotal = orders.reduce((sum, o) => sum + o.distance, 0);

    // Savings ratio
    const savings = individualTotal > 0
        ? ((individualTotal - totalDistance) / individualTotal) * 100
        : 0;

    // Density bonus: more orders in less distance
    const densityScore = Math.min((orders.length / totalDistance) * 20, 30);

    return Math.max(0, Math.min(100, Math.round(savings + densityScore)));
}
