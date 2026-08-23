import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class EarthApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    this.earthMesh = null;
    this.cloudsMesh = null;
    this.atmosphereMesh = null;
    this.starsMesh = null;
    
    this.earthGroup = null;
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLights();
    this.initStars();
    this.initEarth();
    this.initAtmosphere();
    this.initEventListeners();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.earthGroup = new THREE.Group();
    // Inclinação axial real da Terra (~23.5 graus)
    this.earthGroup.rotation.z = (23.44 * Math.PI) / 180;
    this.scene.add(this.earthGroup);
  }

  initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 3.5);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.minDistance = 1.3;
    this.controls.maxDistance = 10.0;
    this.controls.rotateSpeed = 0.8;
  }

  initLights() {
    // Luz ambiente suave para não deixar a face escura 100% invisível
    const ambientLight = new THREE.AmbientLight(0x112233, 0.6);
    this.scene.add(ambientLight);

    // Luz Direcional simulando o Sol
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);
  }

  initStars() {
    const starCount = 3000;
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Variações de cor das estrelas (azuladas, brancas, amareladas)
      const colorType = Math.random();
      if (colorType > 0.8) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 1.0;
      } else if (colorType > 0.6) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.8;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    this.starsMesh = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starsMesh);
  }

  initEarth() {
    const textureLoader = new THREE.TextureLoader();
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);

    // Carregamento de texturas com paths relativos da pasta public
    const earthColor = textureLoader.load('/earth_color.jpg');
    const earthBump = textureLoader.load('/earth_bump.jpg');
    const earthSpecular = textureLoader.load('/earth_specular.jpg');

    // Material Phong para realce do reflexo especular nos oceanos
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthColor,
      bumpMap: earthBump,
      bumpScale: 0.04,
      specularMap: earthSpecular,
      specular: new THREE.Color(0x333333),
      shininess: 25
    });

    this.earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    this.earthGroup.add(this.earthMesh);

    // Camada de nuvens
    const cloudsGeometry = new THREE.SphereGeometry(1.015, 64, 64);
    const cloudsTexture = textureLoader.load('/clouds.png');
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    this.earthGroup.add(this.cloudsMesh);
  }

  initAtmosphere() {
    // Shader customizado para o brilho atmosférico (Fresnel rim glow)
    const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereShader = {
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float intensity = pow(0.6 - dot(vNormal, viewDir), 2.2);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `
    };

    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });

    this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphereMesh);
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Rotação da Terra e das Nuvens (velocidades diferentes para realismo)
    if (this.earthMesh) {
      this.earthMesh.rotation.y += delta * 0.05;
    }
    if (this.cloudsMesh) {
      this.cloudsMesh.rotation.y += delta * 0.07;
    }

    // Leve rotação de fundo para as estrelas
    if (this.starsMesh) {
      this.starsMesh.rotation.y += delta * 0.005;
    }

    // Atualização dos controles com damping
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    // Gerenciamento e descarte de recursos
    if (this.earthMesh) {
      this.earthMesh.geometry.dispose();
      this.earthMesh.material.dispose();
    }
    if (this.cloudsMesh) {
      this.cloudsMesh.geometry.dispose();
      this.cloudsMesh.material.dispose();
    }
    if (this.atmosphereMesh) {
      this.atmosphereMesh.geometry.dispose();
      this.atmosphereMesh.material.dispose();
    }
    if (this.starsMesh) {
      this.starsMesh.geometry.dispose();
      this.starsMesh.material.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

// Inicializa a aplicação
window.addEventListener('DOMContentLoaded', () => {
  new EarthApp();
});
