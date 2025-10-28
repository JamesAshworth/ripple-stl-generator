import React, { useState } from 'react';
import { Download, Waves, Plus, Trash2 } from 'lucide-react';

export default function RippleSTLGenerator() {
  const [sources, setSources] = useState([
    { x: -90, y: -100, amplitude: 1 },
    { x: -100, y: 90, amplitude: 0.8 },
    { x: 90, y: 100, amplitude: 0.9 },
    { x: 100, y: -90, amplitude: 1 }
  ]);
  const [size, setSize] = useState(200);
  const [thickness, setThickness] = useState(2);
  const [resolution, setResolution] = useState(100);
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(0.3);
  const [waveCount, setWaveCount] = useState(3);

  const addSource = () => {
    setSources([...sources, { 
      x: (Math.random() - 0.5) * size, 
      y: (Math.random() - 0.5) * size, 
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
    const topVertices = [];
    const bottomVertices = [];
    const faces = [];
    
    // Generate top surface vertices with ripple effect from multiple sources
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = (i / resolution - 0.5) * size;
        const y = (j / resolution - 0.5) * size;
        
        // Sum ripples from all sources
        let z = 0;
        sources.forEach(source => {
          const dx = x - source.x;
          const dy = y - source.y;
          const distFromSource = Math.sqrt(dx * dx + dy * dy);
          
          // Multiple wave rings from this source
          for (let w = 0; w < waveCount; w++) {
            z += amplitude * source.amplitude * Math.sin(distFromSource * frequency + w * Math.PI / waveCount);
          }
        });
        
        // Average by total number of waves
        z /= (waveCount * sources.length);
        
        topVertices.push([x, y, z]);
        bottomVertices.push([x, y, -thickness]); // Flat bottom at constant depth
      }
    }
    
    // Generate top surface faces (two triangles per grid square)
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const v0 = i * (resolution + 1) + j;
        const v1 = v0 + 1;
        const v2 = v0 + (resolution + 1);
        const v3 = v2 + 1;
        
        // Top surface triangles (normal pointing up)
        faces.push([v0, v2, v1]);
        faces.push([v1, v2, v3]);
      }
    }
    
    const topVertexCount = topVertices.length;
    
    // Generate bottom surface faces (two triangles per grid square)
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const v0 = topVertexCount + i * (resolution + 1) + j;
        const v1 = v0 + 1;
        const v2 = v0 + (resolution + 1);
        const v3 = v2 + 1;
        
        // Bottom surface triangles (normal pointing down)
        faces.push([v0, v1, v2]);
        faces.push([v1, v3, v2]);
      }
    }
    
    // Generate side walls
    // Left wall (i = 0)
    for (let j = 0; j < resolution; j++) {
      const t0 = j;
      const t1 = j + 1;
      const b0 = topVertexCount + j;
      const b1 = topVertexCount + j + 1;
      faces.push([t0, t1, b0]);
      faces.push([t1, b1, b0]);
    }
    
    // Right wall (i = resolution)
    for (let j = 0; j < resolution; j++) {
      const t0 = resolution * (resolution + 1) + j;
      const t1 = resolution * (resolution + 1) + j + 1;
      const b0 = topVertexCount + resolution * (resolution + 1) + j;
      const b1 = topVertexCount + resolution * (resolution + 1) + j + 1;
      faces.push([t0, b0, t1]);
      faces.push([t1, b0, b1]);
    }
    
    // Front wall (j = 0)
    for (let i = 0; i < resolution; i++) {
      const t0 = i * (resolution + 1);
      const t1 = (i + 1) * (resolution + 1);
      const b0 = topVertexCount + i * (resolution + 1);
      const b1 = topVertexCount + (i + 1) * (resolution + 1);
      faces.push([t0, b0, t1]);
      faces.push([t1, b0, b1]);
    }
    
    // Back wall (j = resolution)
    for (let i = 0; i < resolution; i++) {
      const t0 = i * (resolution + 1) + resolution;
      const t1 = (i + 1) * (resolution + 1) + resolution;
      const b0 = topVertexCount + i * (resolution + 1) + resolution;
      const b1 = topVertexCount + (i + 1) * (resolution + 1) + resolution;
      faces.push([t0, t1, b0]);
      faces.push([t1, b1, b0]);
    }
    
    const allVertices = [...topVertices, ...bottomVertices];
    
    return { vertices: allVertices, faces };
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
    const { vertices, faces } = generateRippleMesh();
    
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
      const v0 = vertices[face[0]];
      const v1 = vertices[face[1]];
      const v2 = vertices[face[2]];
      
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

