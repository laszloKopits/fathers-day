#!/usr/bin/env node
/**
 * OSM Data Preprocessor for Haight-Ashbury scene
 * Reads haight-roads.json + haight-buildings.json → haight-processed.json
 */

const fs = require('fs');
const path = require('path');

const CENTER = { lat: 37.770, lon: -122.440 };

// Simple Mercator projection: lat/lon → meters relative to center
function toLocal(lat, lon) {
  const DEG_TO_RAD = Math.PI / 180;
  const R = 6378137; // Earth radius in meters
  const x = (lon - CENTER.lon) * DEG_TO_RAD * R * Math.cos(CENTER.lat * DEG_TO_RAD);
  const z = (lat - CENTER.lat) * DEG_TO_RAD * R;
  return [x, z];
}

function processFile(filename) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, filename), 'utf8'));
  return raw.elements;
}

// Build node lookup from both files
function buildNodeLookup(elements) {
  const nodes = {};
  for (const el of elements) {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon };
    }
  }
  return nodes;
}

// Resolve a way's node IDs to [x, z] coordinates
function resolveWayPoints(way, nodeLookup) {
  const points = [];
  for (const nodeId of way.nodes) {
    const node = nodeLookup[nodeId];
    if (node) {
      points.push(toLocal(node.lat, node.lon));
    }
  }
  return points;
}

function main() {
  console.log('Reading OSM data...');
  const roadElements = processFile('haight-roads.json');
  const buildingElements = processFile('haight-buildings.json');

  console.log(`  Roads file: ${roadElements.length} elements`);
  console.log(`  Buildings file: ${buildingElements.length} elements`);

  // Build combined node lookup
  const nodeLookup = {};
  Object.assign(nodeLookup, buildNodeLookup(roadElements));
  Object.assign(nodeLookup, buildNodeLookup(buildingElements));
  console.log(`  Node lookup: ${Object.keys(nodeLookup).length} nodes`);

  // Process roads
  const roads = [];
  for (const el of roadElements) {
    if (el.type !== 'way' || !el.tags || !el.tags.highway) continue;
    const points = resolveWayPoints(el, nodeLookup);
    if (points.length < 2) continue;

    roads.push({
      points,
      type: el.tags.highway,
      name: el.tags.name || null,
      lanes: el.tags.lanes ? parseInt(el.tags.lanes) : null,
    });
  }

  // Process buildings
  const buildings = [];
  for (const el of buildingElements) {
    if (el.type !== 'way' || !el.tags || !el.tags.building) continue;
    const polygon = resolveWayPoints(el, nodeLookup);
    if (polygon.length < 3) continue;

    const heightStr = el.tags.height || el.tags['building:height'];
    const height = heightStr ? parseFloat(heightStr) : 10;

    buildings.push({
      polygon,
      height: isNaN(height) ? 10 : height,
      type: el.tags.building === 'yes' ? null : el.tags.building,
    });
  }

  // Compute bounds
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const road of roads) {
    for (const [x, z] of road.points) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
  }
  for (const bldg of buildings) {
    for (const [x, z] of bldg.polygon) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
  }

  const output = {
    center: CENTER,
    bounds: {
      minX: Math.round(minX * 100) / 100,
      maxX: Math.round(maxX * 100) / 100,
      minZ: Math.round(minZ * 100) / 100,
      maxZ: Math.round(maxZ * 100) / 100,
    },
    roads,
    buildings,
  };

  const outPath = path.join(__dirname, 'haight-processed.json');
  fs.writeFileSync(outPath, JSON.stringify(output));

  // Stats
  const fileSizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log('\n--- Output Stats ---');
  console.log(`Bounds: X [${output.bounds.minX}, ${output.bounds.maxX}], Z [${output.bounds.minZ}, ${output.bounds.maxZ}]`);
  console.log(`Roads: ${roads.length}`);
  console.log(`Buildings: ${buildings.length}`);
  console.log(`File size: ${fileSizeKB} KB`);
  console.log(`Written to: ${outPath}`);
}

main();
