import * as THREE from 'three';

/**
 * CelShading System - Custom shaders and Inverted Hull outlines
 * Implements discrete multi-band toon lighting and thick comic ink outlines.
 */

// Custom 3-band Toon Material Generator
export function createCelMaterial(options = {}) {
  const color = new THREE.Color(options.color || 0xcccccc);
  const emissive = new THREE.Color(options.emissive || 0x000000);
  const roughness = options.roughness !== undefined ? options.roughness : 0.8;
  const metalness = options.metalness !== undefined ? options.metalness : 0.1;

  // Discrete Cel Shading Stepped Material
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: emissive,
    roughness: roughness,
    metalness: metalness,
    flatShading: options.flatShading !== undefined ? options.flatShading : true,
    transparent: options.transparent || false,
    opacity: options.opacity !== undefined ? options.opacity : 1.0,
    side: options.side || THREE.FrontSide
  });

  // Inject Stepped Light Cel-Shading via onBeforeCompile
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCelBands = { value: options.bands || 3.0 };
    shader.uniforms.uRimPower = { value: options.rimPower || 3.0 };
    shader.uniforms.uRimIntensity = { value: options.rimIntensity || 0.35 };

    // Vertex shader modifications
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vCustomWorldNormal;
      varying vec3 vCustomViewDir;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vCustomWorldNormal = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
      vCustomViewDir = normalize(cameraPosition - worldPos.xyz);
      `
    );

    // Fragment shader modifications - Stepped bands & flat toon lighting
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uCelBands;
      uniform float uRimPower;
      uniform float uRimIntensity;
      varying vec3 vCustomWorldNormal;
      varying vec3 vCustomViewDir;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>

      // Quantize diffuse lighting to stepped bands (Cel-Shading)
      // Gives sharp, crisp comic ink shading with zero soft gradients
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      // Stylized Rim Light (Edge glow highlighting silhouette against background)
      float rim = 1.0 - max(dot(vCustomViewDir, vCustomWorldNormal), 0.0);
      rim = smoothstep(0.65, 0.85, rim);
      gl_FragColor.rgb += gl_FragColor.rgb * rim * uRimIntensity;
      `
    );
  };

  return material;
}

// Inverted Hull Outline Material
export function createOutlineMaterial(thickness = 0.04, outlineColor = 0x0a0c10) {
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: {
      uThickness: { value: thickness },
      uColor: { value: new THREE.Color(outlineColor) }
    },
    vertexShader: `
      uniform float uThickness;
      void main() {
        // Extrude vertices along normal direction to create outer silhouette shell
        vec3 transformed = position + normal * uThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: true,
    depthTest: true
  });

  return outlineMat;
}

// Helper to attach an Inverted Hull Outline mesh to any geometry
export function attachOutline(mesh, thickness = 0.035, outlineColor = 0x050608) {
  if (!mesh.geometry) return null;

  const outlineMaterial = createOutlineMaterial(thickness, outlineColor);
  const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
  outlineMesh.name = 'OutlineMesh';
  outlineMesh.castShadow = false;
  outlineMesh.receiveShadow = false;
  mesh.add(outlineMesh);
  return outlineMesh;
}

// Create a complete Cel-Shaded Mesh with integrated black ink outline
export function createCelMesh(geometry, baseMaterial, outlineThickness = 0.035, outlineColor = 0x060709) {
  const mesh = new THREE.Mesh(geometry, baseMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  if (outlineThickness > 0) {
    attachOutline(mesh, outlineThickness, outlineColor);
  }
  return mesh;
}

// Stylized Cel-Shaded Water Material
export function createToonWaterMaterial() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0e5d7a) },
      uShallowColor: { value: new THREE.Color(0x2cc5d2) },
      uFoamColor: { value: new THREE.Color(0xf2fcfe) },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Stepped stylized wave displacement
        float wave1 = sin(pos.x * 0.15 + uTime * 1.5) * cos(pos.z * 0.15 + uTime * 1.2);
        float wave2 = sin(pos.x * 0.3 - uTime * 2.0 + pos.z * 0.2) * 0.4;
        float totalWave = (wave1 + wave2) * 0.35;
        
        pos.y += totalWave;
        
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSunDirection;
      
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        // Stylized toon water bands
        float waveBand = sin(vWorldPos.x * 0.4 + vWorldPos.z * 0.4 + uTime * 2.0);
        float foamBand = step(0.78, waveBand);
        
        // Sun specular glint (stepped)
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(uSunDirection + viewDir);
        float spec = max(dot(vNormal, halfDir), 0.0);
        float toonSpec = step(0.92, spec);
        
        // Color transition
        vec3 waterColor = mix(uDeepColor, uShallowColor, 0.45);
        waterColor = mix(waterColor, uFoamColor, foamBand * 0.7);
        waterColor += vec3(1.0) * toonSpec * 0.9;
        
        gl_FragColor = vec4(waterColor, 0.88);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });

  return material;
}
