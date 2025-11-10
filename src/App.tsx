import React, { useState } from 'react';
import { Download, Waves, Plus, Trash2 } from 'lucide-react';

export default function RippleSTLGenerator() {
  const [sources, setSources] = useState([
    { x: -90, y: -50, amplitude: 1 },
    { x: -95, y: 0, amplitude: 1.2 },
    { x: -100, y: 45, amplitude: 0.8 },
    { x: 90, y: 50, amplitude: 0.9 },
    { x: 95, y: 0, amplitude: 1.1 },
    { x: 100, y: -45, amplitude: 1 }
  ]);
  const [size, setSize] = useState(200);
  const [thickness, setThickness] = useState(2);
  const [resolution, setResolution] = useState(100);
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(0.3);
  const [waveCount, setWaveCount] = useState(3);
  const precision = 100;

  const addSource = () => {
    setSources([...sources, { 
      x: 0, 
      y: 0, 
      amplitude: 1
    }]);
  };

  const removeSource = (index) => {
    if (sources.length > 1) {
      setSources(sources.filter((_, i) => i !== index));
    }
  };

  const updateSource = (index, field, value) => {
    const newSources = [...sources];
    newSources[index][field] = value;
    setSources(newSources);
  };

  const generateRippleMesh = () => {
    const topVertices = {};
    const radius = size / 2;
    
    // Generate top surface vertices with ripple effect from multiple sources
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        var checkX = (i / resolution - 0.5) * size;
        var checkY = (j / resolution - 0.5) * size;
        
        // Skip points outside the circle
        if (checkX**2 + checkY**2 >= radius**2)
          continue;
        
        // Avoid floating point issues by rounding to a set fraction of a mm
        const x = Math.round(checkX * precision) / precision;
        const y = Math.round(checkY * precision) / precision;
        
        if (!(x in topVertices))
          topVertices[x]={};
        
        // Sum ripples from all sources
        let z = 0;
        sources.forEach(source => {
          const dx = x - source.x;
          const dy = y - source.y;
          const distFromSource = (dx ** 2 + dy ** 2) ** 0.5;
          
          // Multiple wave rings from this source
          for (let w = 0; w < waveCount; w++) {
            z += amplitude * source.amplitude * Math.sin(distFromSource * frequency + w * Math.PI / waveCount);
          }
        });
        
        // Average by total number of waves
        z /= (waveCount * sources.length);
        
        topVertices[x][y] = z;
      }
    }
    
    const edgeVerticesX = {};
    const edgeVerticesY = {};
    
    // Generate edge vertices on the top and bottom
    for (let i = 0; i <= resolution; i++) {
      for (let s = -1; s <= 1; s+=2) {
        const x = Math.round((i / resolution - 0.5) * size * precision) / precision;
        
        const y = Math.round((radius ** 2 - x ** 2) ** 0.5 * s * precision) / precision;
        
        // We want to be more precise in the x than just precision for left and right, so only calculate top and bottom
        if (Math.abs(x) > Math.abs(y))
          continue;
        
        if (!(x in edgeVerticesX))
          edgeVerticesX[x] = {};
        if (!(y in edgeVerticesY))
          edgeVerticesY[y] = [];
        
        // Sum ripples from all sources
        let z = 0;
        sources.forEach(source => {
          const dx = x - source.x;
          const dy = y - source.y;
          const distFromSource = (dx ** 2 + dy ** 2) ** 0.5;
          
          // Multiple wave rings from this source
          for (let w = 0; w < waveCount; w++) {
            z += amplitude * source.amplitude * Math.sin(distFromSource * frequency + w * Math.PI / waveCount);
          }
        });
        
        // Average by total number of waves
        z /= (waveCount * sources.length);
        
        edgeVerticesX[x][y] = z;
        edgeVerticesY[y].push(x);
      }
    }
    
    // Generate edge vertices on the left and right
    for (let i = 0; i <= resolution; i++) {
      for (let s = -1; s <= 1; s+=2) {
        const y = Math.round((i / resolution - 0.5) * size * precision) / precision;
        
        const x = Math.round((radius ** 2 - y ** 2) ** 0.5 * s * precision) / precision;
        
        // We want to be more precise in the y than just precision for top and bottom, so only calculate left and right
        if (Math.abs(x) < Math.abs(y))
          continue;
        
        if (!(x in edgeVerticesX))
          edgeVerticesX[x] = {};
        if (!(y in edgeVerticesY))
          edgeVerticesY[y] = [];
        
        // Sum ripples from all sources
        let z = 0;
        sources.forEach(source => {
          const dx = x - source.x;
          const dy = y - source.y;
          const distFromSource = (dx ** 2 + dy ** 2) ** 0.5;
          
          // Multiple wave rings from this source
          for (let w = 0; w < waveCount; w++) {
            z += amplitude * source.amplitude * Math.sin(distFromSource * frequency + w * Math.PI / waveCount);
          }
        });
        
        // Average by total number of waves
        z /= (waveCount * sources.length);
        
        edgeVerticesX[x][y] = z;
        edgeVerticesY[y].push(x);
      }
    }
    
    return { topVertices, edgeVerticesX, edgeVerticesY };
  };

  const calculateNormal = (v0, v1, v2) => {
    const u = [
      v1[0] - v0[0],
      v1[1] - v0[1],
      v1[2] - v0[2]
    ];
    const v = [
      v2[0] - v0[0],
      v2[1] - v0[1],
      v2[2] - v0[2]
    ];
    
    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
    
    const length = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
    return normal.map(n => n / length);
  };

  const generateSTL = () => {
    const { topVertices, edgeVerticesX, edgeVerticesY } = generateRippleMesh();
    
    const topFaces = [];
    const radius = size / 2;
    
    // Calculate the top faces where at least three points of a given grid square are defined
    const sortedX = Object.keys(topVertices).sort(function(a, b) { return a - b; });
    for (let i = 0; i < sortedX.length - 1; i++) {
      const x0 = sortedX[i];
      const x1 = sortedX[i + 1];
      const sortedY = [...new Set([...Object.keys(topVertices[x0]), ...Object.keys(topVertices[x1])])].sort(function(a, b) { return a - b; });
      
      for (let j = 0; j < sortedY.length - 1; j++) {
        const y0 = sortedY[j];
        const y1 = sortedY[j + 1];
        
        // SW quadrant (or intersecting centre lines)
        if (x0 < 0 && y0 < 0) { 
          // Only two points defined, skip
          if (!(y1 in topVertices[x0]))
            continue;
          
          // Full square, generate outer triangle
          if (y0 in topVertices[x0])
          {
            topFaces.push([[x0, y0, topVertices[x0][y0]], [x0, y1, topVertices[x0][y1]], [x1, y0, topVertices[x1][y0]]]);
          }
          
          // Generate inner triangle
          topFaces.push([[x0, y1, topVertices[x0][y1]], [x1, y1, topVertices[x1][y1]], [x1, y0, topVertices[x1][y0]]]);
        }
        // NE quadrant
        else if (x1 > 0 && y1 > 0) { 
          // Only two points defined, skip
          if (!(y0 in topVertices[x1]))
            continue;
          
          // Full square, generate outer triangle
          if (y1 in topVertices[x1])
          {
            topFaces.push([[x0, y1, topVertices[x0][y1]], [x1, y1, topVertices[x1][y1]], [x1, y0, topVertices[x1][y0]]]);
          }
          
          // Generate inner triangle
          topFaces.push([[x0, y0, topVertices[x0][y0]], [x0, y1, topVertices[x0][y1]], [x1, y0, topVertices[x1][y0]]]);
        }
        // NW quadrant
        else if (x0 < 0 && y1 > 0) { 
          // Only two points defined, skip
          if (!(y0 in topVertices[x0]))
            continue;
          
          // Full square, generate outer triangle
          if (y1 in topVertices[x0])
          {
            topFaces.push([[x0, y1, topVertices[x0][y1]], [x1, y1, topVertices[x1][y1]], [x0, y0, topVertices[x0][y0]]]);
          }
          
          // Generate inner triangle
          topFaces.push([[x1, y1, topVertices[x1][y1]], [x1, y0, topVertices[x1][y0]], [x0, y0, topVertices[x0][y0]]]);
        }
        // SE quadrant, by elimination
        else { 
          // Only two points defined, skip
          if (!(y1 in topVertices[x1]))
            continue;
          
          // Full square, generate outer triangle
          if (y0 in topVertices[x1])
          {
            topFaces.push([[x1, y1, topVertices[x1][y1]], [x1, y0, topVertices[x1][y0]], [x0, y0, topVertices[x0][y0]]]);
          }
          
          // Generate inner triangle
          topFaces.push([[x0, y1, topVertices[x0][y1]], [x1, y1, topVertices[x1][y1]], [x0, y0, topVertices[x0][y0]]]);
        }
      }
    }
    
    // Generate all remaining triangles where the circumference has cut the grid
    for (let i = 0; i <= resolution - 1; i++) {
      for (let j = 0; j <= resolution - 1; j++) {
        const x0 = Math.round((i / resolution - 0.5) * size * precision) / precision;
        const y0 = Math.round((j / resolution - 0.5) * size * precision) / precision;
        
        const x1 = Math.round(((i + 1) / resolution - 0.5) * size * precision) / precision;
        const y1 = Math.round(((j + 1) / resolution - 0.5) * size * precision) / precision;
        
        // SW quadrant (or intersecting centre lines) where bottom left is outside the circle
        if (x0 < 0 && y0 < 0 && x1 in topVertices && y1 in topVertices[x1] && (!(x0 in topVertices) || !(y0 in topVertices[x0]))) {
          // Only missing one point here, so we already have top right triangle
          if (y0 in topVertices[x1] && x0 in topVertices && y1 in topVertices[x0]) {
            // We have a suitable point in line with x but crimped on the bottom
            if (x0 in edgeVerticesX) {
              const newY0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a >= y0 && a < y1; })[0];
              topFaces.push([[x0, newY0, edgeVerticesX[x0][newY0]], [x0, y1, topVertices[x0][y1]], [x1, y0, topVertices[x1][y0]]]);
            }
            // We have a suitable point in line with y but crimped on the left
            else if (y0 in edgeVerticesY) {
              const newX0 = edgeVerticesY[y0].filter(function(a) { return a >= x0 && a < x1; })[0];
              topFaces.push([[newX0, y0, edgeVerticesX[newX0][y0]], [x0, y1, topVertices[x0][y1]], [x1, y0, topVertices[x1][y0]]]);
            }
            // The dreaded pentagon
            else {
              const yBx1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a < 0; })[0];
              const xLy1 = edgeVerticesY[y1].filter(function(a) { return a < 0; })[0];
              
              // Generate "inner" triangle
              topFaces.push([[x1, yBx1, edgeVerticesX[x1][yBx1]], [x0, y1, topVertices[x0][y1]], [x1, y0, topVertices[x1][y0]]]);
              
              // Generate "outer" triangle
              topFaces.push([[x1, yBx1, edgeVerticesX[x1][yBx1]], [xLy1, y1, edgeVerticesX[xLy1][y1]], [x0, y1, topVertices[x0][y1]]]);
            }
          }
          // Missing two points on the left, so make an awkward quadrilateral and split it accordingly
          else if (y0 in topVertices[x1]) {
            const x0y0 = edgeVerticesY[y0].filter(function(a) { return a >= x0 && a < x1; })[0];
            const x0y1 = edgeVerticesY[y1].filter(function(a) { return a >= x0 && a < x1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x0y0, y0, edgeVerticesX[x0y0][y0]], [x0y1, y1, edgeVerticesX[x0y1][y1]], [x1, y0, topVertices[x1][y0]]]);
            
            // Generate inner triangle
            topFaces.push([[x0y1, y1, edgeVerticesX[x0y1][y1]], [x1, y1, topVertices[x1][y1]], [x1, y0, topVertices[x1][y0]]]);
          }
          // Missing two points on the bottom, so make an awkward quadrilateral and split it accordingly
          else if (x0 in topVertices && y1 in topVertices[x0]) {
            const y0x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a >= y0 && a < y1; })[0];
            const y0x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a >= y0 && a < y1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x0, y0x0, edgeVerticesX[x0][y0x0]], [x0, y1, topVertices[x0][y1]], [x1, y0x1, edgeVerticesX[x1][y0x1]]]);
            
            // Generate inner triangle
            topFaces.push([[x0, y1, topVertices[x0][y1]], [x1, y1, topVertices[x1][y1]], [x1, y0x1, edgeVerticesX[x1][y0x1]]]);
          }
          // Missing three points, so make a triangle and call it a day
          else {
            // Point directly below the top-right corner
            if (x1 in edgeVerticesX) {
              const y0x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a < 0; })[0];
              
              // Point directly to the left of the top-right corner
              if (y1 in edgeVerticesY) {
                const x0y1 = edgeVerticesY[y1].filter(function(a) { return a < 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x0y1, y1, edgeVerticesX[x0y1][y1]], [x1, y1, topVertices[x1][y1]], [x1, y0x1, edgeVerticesX[x1][y0x1]]]);
              }
              // Point directly in-line with the left edge
              else if (x0 in edgeVerticesX) {
                const y1x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a < 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x0, y1x0, edgeVerticesX[x0][y1x0]], [x1, y1, topVertices[x1][y1]], [x1, y0x1, edgeVerticesX[x1][y0x1]]]);
              }
            }
            // Point directly to the left of the top-right corner, and a point directly in-line with the bottom edge
            else if (y0 in edgeVerticesY && y1 in edgeVerticesY) {
              const x0y1 = edgeVerticesY[y1].filter(function(a) { return a < 0; })[0];
              const x1y0 = edgeVerticesY[y0].filter(function(a) { return a < 0; })[0];
              
              // Generate inner triangle
              topFaces.push([[x0y1, y1, edgeVerticesX[x0y1][y1]], [x1, y1, topVertices[x1][y1]], [x1y0, y0, edgeVerticesX[x1y0][y0]]]);
            }
          }
        }
        // NE quadrant where top right is outside the circle
        else if (x1 > 0 && y1 > 0 && x0 in topVertices && y0 in topVertices[x0] && (!(x1 in topVertices) || !(y1 in topVertices[x1]))) {
          // Only missing one point here, so we already have bottom left triangle
          if (y1 in topVertices[x0] && x1 in topVertices && y0 in topVertices[x1]) {
            // We have a suitable point in line with x but crimped on the top
            if (x1 in edgeVerticesX) {
              const newY1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a > y0 && a <= y1; })[0];
              topFaces.push([[x1, newY1, edgeVerticesX[x1][newY1]], [x1, y0, topVertices[x1][y0]], [x0, y1, topVertices[x0][y1]]]);
            }
            // We have a suitable point in line with y but crimped on the right
            else if (y1 in edgeVerticesY) {
              const newX1 = edgeVerticesY[y1].filter(function(a) { return a > x0 && a <= x1; })[0];
              topFaces.push([[newX1, y1, edgeVerticesX[newX1][y1]], [x1, y0, topVertices[x1][y0]], [x0, y1, topVertices[x0][y1]]]);
            }
            // The dreaded pentagon
            else {
              const yTx0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a > 0; })[0];
              const xRy0 = edgeVerticesY[y0].filter(function(a) { return a > 0; })[0];
              
              // Generate "inner" triangle
              topFaces.push([[x0, yTx0, edgeVerticesX[x0][yTx0]], [x1, y0, topVertices[x1][y0]], [x0, y1, topVertices[x0][y1]]]);
              
              // Generate "outer" triangle
              topFaces.push([[x0, yTx0, edgeVerticesX[x0][yTx0]], [xRy0, y0, edgeVerticesX[xRy0][y0]], [x1, y0, topVertices[x1][y0]]]);
            }
          }
          // Missing two points on the right, so make an awkward quadrilateral and split it accordingly
          else if (y1 in topVertices[x0]) {
            const x1y1 = edgeVerticesY[y1].filter(function(a) { return a > x0 && a <= x1; })[0];
            const x1y0 = edgeVerticesY[y0].filter(function(a) { return a > x0 && a <= x1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x1y1, y1, edgeVerticesX[x1y1][y1]], [x1y0, y0, edgeVerticesX[x1y0][y0]], [x0, y1, topVertices[x0][y1]]]);
            
            // Generate inner triangle
            topFaces.push([[x1y0, y0, edgeVerticesX[x1y0][y0]], [x0, y0, topVertices[x0][y0]], [x0, y1, topVertices[x0][y1]]]);
          }
          // Missing two points on the top, so make an awkward quadrilateral and split it accordingly
          else if (x1 in topVertices && y0 in topVertices[x1]) {
            const y1x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a > y0 && a <= y1; })[0];
            const y1x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a > y0 && a <= y1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x1, y1x1, edgeVerticesX[x1][y1x1]], [x1, y0, topVertices[x1][y0]], [x0, y1x0, edgeVerticesX[x0][y1x0]]]);
            
            // Generate inner triangle
            topFaces.push([[x1, y0, topVertices[x1][y0]], [x0, y0, topVertices[x0][y0]], [x0, y1x0, edgeVerticesX[x0][y1x0]]]);
          }
          // Missing three points, so make a triangle and call it a day
          else {
            // Point directly above the bottom-left corner
            if (x0 in edgeVerticesX) {
              const y1x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a > 0; })[0];
              
              // Point directly to the right of the bottom-left corner
              if (y0 in edgeVerticesY) {
                const x1y0 = edgeVerticesY[y0].filter(function(a) { return a > 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x1y0, y0, edgeVerticesX[x1y0][y0]], [x0, y0, topVertices[x0][y0]], [x0, y1x0, edgeVerticesX[x0][y1x0]]]);
              }
              // Point directly in-line with the right edge
              else if (x1 in edgeVerticesX) {
                const y0x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a > 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x1, y0x1, edgeVerticesX[x1][y0x1]], [x0, y0, topVertices[x0][y0]], [x0, y1x0, edgeVerticesX[x0][y1x0]]]);
              }
            }
            // Point directly to the right of the bottom-left corner, and a point directly in-line with the top edge
            else if (y0 in edgeVerticesY && y1 in edgeVerticesY) {
              const x1y0 = edgeVerticesY[y0].filter(function(a) { return a > 0; })[0];
              const x0y1 = edgeVerticesY[y1].filter(function(a) { return a > 0; })[0];
              
              // Generate inner triangle
              topFaces.push([[x1y0, y0, edgeVerticesX[x1y0][y0]], [x0, y0, topVertices[x0][y0]], [x0y1, y1, edgeVerticesX[x0y1][y1]]]);
            }
          }
        }
        // NW quadrant where top left is outside the circle
        else if (x0 < 0 && y1 > 0 && x1 in topVertices && y0 in topVertices[x1] && (!(x0 in topVertices) || !(y1 in topVertices[x0]))) {
          // Only missing one point here, so we already have bottom right triangle
          if (y1 in topVertices[x1] && x0 in topVertices && y0 in topVertices[x0]) {
            // We have a suitable point in line with x but crimped on the top
            if (x0 in edgeVerticesX) {
              const newY1 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a > y0 && a <= y1; })[0];
              topFaces.push([[x0, newY1, edgeVerticesX[x0][newY1]], [x1, y1, topVertices[x1][y1]], [x0, y0, topVertices[x0][y0]]]);
            }
            // We have a suitable point in line with y but crimped on the left
            else if (y1 in edgeVerticesY) {
              const newX0 = edgeVerticesY[y1].filter(function(a) { return a >= x0 && a < x1; })[0];
              topFaces.push([[newX0, y1, edgeVerticesX[newX0][y1]], [x1, y1, topVertices[x1][y1]], [x0, y0, topVertices[x0][y0]]]);
            }
            // The dreaded pentagon
            else {
              const yTx1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a > 0; })[0];
              const xLy0 = edgeVerticesY[y0].filter(function(a) { return a < 0; })[0];
              
              // Generate "inner" triangle
              topFaces.push([[xLy0, y0, edgeVerticesX[xLy0][y0]], [x1, y1, topVertices[x1][y1]], [x0, y0, topVertices[x0][y0]]]);
              
              // Generate "outer" triangle
              topFaces.push([[xLy0, y0, edgeVerticesX[xLy0][y0]], [x1, yTx1, edgeVerticesX[x1][yTx1]], [x1, y1, topVertices[x1][y1]]]);
            }
          }
          // Missing two points on the left, so make an awkward quadrilateral and split it accordingly
          else if (y1 in topVertices[x1]) {
            const x0y1 = edgeVerticesY[y1].filter(function(a) { return a >= x0 && a < x1; })[0];
            const x0y0 = edgeVerticesY[y0].filter(function(a) { return a >= x0 && a < x1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x0y1, y1, edgeVerticesX[x0y1][y1]], [x1, y1, topVertices[x1][y1]], [x0y0, y0, edgeVerticesX[x0y0][y0]]]);
            
            // Generate inner triangle
            topFaces.push([[x1, y1, topVertices[x1][y1]], [x1, y0, topVertices[x1][y0]], [x0y0, y0, edgeVerticesX[x0y0][y0]]]);
          }
          // Missing two points on the top, so make an awkward quadrilateral and split it accordingly
          else if (x0 in topVertices && y0 in topVertices[x0]) {
            const y1x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a > y0 && a <= y1; })[0];
            const y1x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a > y0 && a <= y1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x1, y1x1, edgeVerticesX[x1][y1x1]], [x0, y0, topVertices[x0][y0]], [x0, y1x0, edgeVerticesX[x0][y1x0]]]);
            
            // Generate inner triangle
            topFaces.push([[x1, y0, topVertices[x1][y0]], [x0, y0, topVertices[x0][y0]], [x1, y1x1, edgeVerticesX[x1][y1x1]]]);
          }
          // Missing three points, so make a triangle and call it a day
          else {
            // Point directly above the bottom-right corner
            if (x1 in edgeVerticesX) {
              const y1x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a > 0; })[0];
              
              // Point directly to the left of the bottom-right corner
              if (y0 in edgeVerticesY) {
                const x0y0 = edgeVerticesY[y0].filter(function(a) { return a < 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x0y0, y0, edgeVerticesX[x0y0][y0]], [x1, y1x1, edgeVerticesX[x1][y1x1]], [x1, y0, topVertices[x1][y0]]]);
              }
              // Point directly in-line with the left edge
              else if (x0 in edgeVerticesX) {
                const y0x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a > 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x1, y1x1, edgeVerticesX[x1][y1x1]], [x1, y0, topVertices[x1][y0]], [x0, y0x0, edgeVerticesX[x0][y0x0]]]);
              }
            }
            // Point directly to the left of the bottom-right corner, and a point directly in-line with the top edge
            else if (y0 in edgeVerticesY && y1 in edgeVerticesY) {
              const x0y0 = edgeVerticesY[y0].filter(function(a) { return a < 0; })[0];
              const x1y1 = edgeVerticesY[y1].filter(function(a) { return a < 0; })[0];
              
              // Generate inner triangle
              topFaces.push([[x0y0, y0, edgeVerticesX[x0y0][y0]], [x1y1, y1, edgeVerticesX[x1y1][y1]], [x1, y0, topVertices[x1][y0]]]);
            }
          }
        }
        // SE quadrant where bottom right is outside the circle
        else if (x1 > 0 && y0 < 0 && x0 in topVertices && y1 in topVertices[x0] && (!(x1 in topVertices) || !(y0 in topVertices[x1]))) {
          // Only missing one point here, so we already have top left triangle
          if (y0 in topVertices[x0] && x1 in topVertices && y1 in topVertices[x1]) {
            // We have a suitable point in line with x but crimped on the bottom
            if (x1 in edgeVerticesX) {
              const newY0 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a >= y0 && a < y1; })[0];
              topFaces.push([[x1, newY0, edgeVerticesX[x1][newY0]], [x0, y0, topVertices[x0][y0]], [x1, y1, topVertices[x1][y1]]]);
            }
            // We have a suitable point in line with y but crimped on the right
            else if (y0 in edgeVerticesY) {
              const newX1 = edgeVerticesY[y0].filter(function(a) { return a > x0 && a <= x1; })[0];
              topFaces.push([[newX1, y0, edgeVerticesX[newX1][y0]], [x0, y0, topVertices[x0][y0]], [x1, y1, topVertices[x1][y1]]]);
            }
            // The dreaded pentagon
            else {
              const yBx0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a < 0; })[0];
              const xRy1 = edgeVerticesY[y1].filter(function(a) { return a > 0; })[0];
              
              // Generate "inner" triangle
              topFaces.push([[xRy1, y1, edgeVerticesX[xRy1][y1]], [x0, y0, topVertices[x0][y0]], [x1, y1, topVertices[x1][y1]]]);
              
              // Generate "outer" triangle
              topFaces.push([[xRy1, y1, edgeVerticesX[xRy1][y1]], [x0, yBx0, edgeVerticesX[x0][yBx0]], [x0, y0, topVertices[x0][y0]]]);
            }
          }
          // Missing two points on the right, so make an awkward quadrilateral and split it accordingly
          else if (y0 in topVertices[x0]) {
            const x1y0 = edgeVerticesY[y0].filter(function(a) { return a > x0 && a <= x1; })[0];
            const x1y1 = edgeVerticesY[y1].filter(function(a) { return a > x0 && a <= x1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x1y0, y0, edgeVerticesX[x1y0][y0]], [x0, y0, topVertices[x0][y0]], [x1y1, y1, edgeVerticesX[x1y1][y1]]]);
            
            // Generate inner triangle
            topFaces.push([[x0, y0, topVertices[x0][y0]], [x0, y1, topVertices[x0][y1]], [x1y1, y1, edgeVerticesX[x1y1][y1]]]);
          }
          // Missing two points on the bottom, so make an awkward quadrilateral and split it accordingly
          else if (x1 in topVertices && y1 in topVertices[x1]) {
            const y0x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a >= y0 && a < y1; })[0];
            const y0x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a >= y0 && a < y1; })[0];
            
            // Generate outer triangle
            topFaces.push([[x0, y0x0, edgeVerticesX[x0][y0x0]], [x1, y1, topVertices[x1][y1]], [x1, y0x1, edgeVerticesX[x1][y0x1]]]);
            
            // Generate inner triangle
            topFaces.push([[x0, y1, topVertices[x0][y1]], [x1, y1, topVertices[x1][y1]], [x0, y0x0, edgeVerticesX[x0][y0x0]]]);
          }
          // Missing three points, so make a triangle and call it a day
          else {
            // Point directly below the top-left corner
            if (x0 in edgeVerticesX) {
              const y0x0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a < 0; })[0];
              
              // Point directly to the right of the top-left corner
              if (y1 in edgeVerticesY) {
                const x1y1 = edgeVerticesY[y1].filter(function(a) { return a > 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x1y1, y1, edgeVerticesX[x1y1][y1]], [x0, y0x0, edgeVerticesX[x0][y0x0]], [x0, y1, topVertices[x0][y1]]]);
              }
              // Point directly in-line with the right edge
              else if (x1 in edgeVerticesX) {
                const y1x1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a < 0; })[0];
                
                // Generate inner triangle
                topFaces.push([[x0, y0x0, edgeVerticesX[x0][y0x0]], [x0, y1, topVertices[x0][y1]], [x1, y1x1, edgeVerticesX[x1][y1x1]]]);
              }
            }
            // Point directly to the right of the top-left corner, and a point directly in-line with the bottom edge
            else if (y0 in edgeVerticesY && y1 in edgeVerticesY) {
              const x1y1 = edgeVerticesY[y1].filter(function(a) { return a > 0; })[0];
              const x0y0 = edgeVerticesY[y0].filter(function(a) { return a > 0; })[0];
              
              // Generate inner triangle
              topFaces.push([[x1y1, y1, edgeVerticesX[x1y1][y1]], [x0y0, y0, edgeVerticesX[x0y0][y0]], [x0, y1, topVertices[x0][y1]]]);
            }
          }
        }
      }
    }
    
    const faces = [];
    
    topFaces.forEach(topFace => {
      faces.push(topFace);
      faces.push([[topFace[0][0], topFace[0][1], -thickness], [topFace[2][0], topFace[2][1], -thickness], [topFace[1][0], topFace[1][1], -thickness]]);
    });
    
    // Calculate the edge faces around the top and bottom
    for (let s = -1; s <= 1; s += 2) {
      const sortedX = Object.keys(edgeVerticesX).sort(function(a, b) { return a - b; });
      for (let i = 0; i < sortedX.length - 1; i++) {
        const x0 = sortedX[i];
        const x1 = sortedX[i + 1];
        const y0 = Object.keys(edgeVerticesX[x0]).filter(function(a) { return a * s >= 0; })[0];
        const y1 = Object.keys(edgeVerticesX[x1]).filter(function(a) { return a * s >= 0; })[0];
        
        // Always clockwise
        if (s > 0) {
          faces.push([[x0, y0, -thickness], [x1, y1, -thickness], [x1, y1, edgeVerticesX[x1][y1]]]);
          faces.push([[x0, y0, -thickness], [x1, y1, edgeVerticesX[x1][y1]], [x0, y0, edgeVerticesX[x0][y0]]]);
        }
        else {
          faces.push([[x0, y0, -thickness], [x1, y1, edgeVerticesX[x1][y1]], [x1, y1, -thickness]]);
          faces.push([[x0, y0, -thickness], [x0, y0, edgeVerticesX[x0][y0]], [x1, y1, edgeVerticesX[x1][y1]]]);
        }
      }
    }
    
    // Create binary STL
    const triangleCount = faces.length;
    const bufferSize = 84 + (triangleCount * 50); // Header + triangles
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    // Write header (80 bytes)
    const header = 'Rippling Water Surface';
    for (let i = 0; i < 80; i++) {
      view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
    }
    
    // Write triangle count
    view.setUint32(80, triangleCount, true);
    
    // Write triangles
    let offset = 84;
    faces.forEach(face => {
      const v0 = face[0];
      const v1 = face[1];
      const v2 = face[2];
      
      const normal = calculateNormal(v0, v1, v2);
      
      // Normal vector
      view.setFloat32(offset, normal[0], true); offset += 4;
      view.setFloat32(offset, normal[1], true); offset += 4;
      view.setFloat32(offset, normal[2], true); offset += 4;
      
      // Vertices
      [v0, v1, v2].forEach(v => {
        view.setFloat32(offset, v[0], true); offset += 4;
        view.setFloat32(offset, v[1], true); offset += 4;
        view.setFloat32(offset, v[2], true); offset += 4;
      });
      
      // Attribute byte count
      view.setUint16(offset, 0, true); offset += 2;
    });
    
    return buffer;
  };

  const downloadSTL = () => {
    const stlData = generateSTL();
    const blob = new Blob([stlData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rippling_water.stl';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Waves className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Rippling Water STL Generator</h1>
        </div>
        
        <p className="text-gray-600 mb-8">
          Create a 3D printable surface with multiple rippling water sources. Add and position sources to create complex interference patterns and non-circular ripples.
        </p>

        <div className="space-y-6">
          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Ripple Sources</h3>
              <button
                onClick={addSource}
                className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sources.map((source, idx) => (
                <div key={idx} className="bg-white p-3 rounded border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Source {idx + 1}</span>
                    {sources.length > 1 && (
                      <button
                        onClick={() => removeSource(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-gray-600 mb-1">X: {source.x.toFixed(1)}</label>
                      <input
                        type="range"
                        min={-size/2}
                        max={size/2}
                        step="1"
                        value={source.x}
                        onChange={(e) => updateSource(idx, 'x', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Y: {source.y.toFixed(1)}</label>
                      <input
                        type="range"
                        min={-size/2}
                        max={size/2}
                        step="1"
                        value={source.y}
                        onChange={(e) => updateSource(idx, 'y', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Power: {source.amplitude.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={source.amplitude}
                        onChange={(e) => updateSource(idx, 'amplitude', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surface Size: {size}mm
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Box Thickness: {thickness}mm
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={thickness}
              onChange={(e) => setThickness(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Depth of the box below the rippled surface</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution: {resolution} × {resolution}
            </label>
            <input
              type="range"
              min="20"
              max="100"
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Higher resolution = smoother surface (larger file)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wave Amplitude: {amplitude}mm
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wave Frequency: {frequency.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Wave Rings: {waveCount}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={waveCount}
              onChange={(e) => setWaveCount(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <button
          onClick={downloadSTL}
          className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-5 h-5" />
          Generate & Download STL
        </button>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Tips:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• The model is a solid box with ripples on the top surface</li>
            <li>• Add multiple sources to create complex interference patterns</li>
            <li>• Position sources at different locations for non-circular ripples</li>
            <li>• Adjust each source's power to create varied wave heights</li>
            <li>• Increase box thickness for more structural strength</li>
            <li>• Higher resolution creates smoother waves but larger files</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

