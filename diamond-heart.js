import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js";
import { Howl, Howler } from "https://cdn.jsdelivr.net/npm/howler@2.2.3/+esm";

class DiamondHeart {
  constructor() {
    this.preloadShaderTextures();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;

    const existingCanvas = document.querySelector(".scene canvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }

    document.querySelector(".scene").appendChild(this.renderer.domElement);

    this.createHeart();
    this.setupLights();
    this.setupEnvironment();
    this.createDolphinPendant();
    this.createHeartPendant();
    
    this.additionalHearts = [];
    for (let i = 0; i < 3; i++) {
      this.additionalHearts.push(this.createAdditionalHeartPendant(i));
    }

    this.initParticles();
    this.initEventListeners();
    this.lastUpdate = Date.now();

    this.initAudioReactivity();
    
    // Cập nhật hiển thị nút với class visible
    setTimeout(() => {
      const sceneButton = document.querySelector('.scene-start-button');
      if (sceneButton) {
        sceneButton.classList.add('visible');
      }
    }, 2000);
    
    this.animate();
  }

  async preloadShaderTextures() {
    const textureLoader = new THREE.TextureLoader();

    try {
      // Sử dụng Promise để xử lý lỗi tốt hơn
      this.particleTexture = await new Promise((resolve, reject) => {
        textureLoader.load(
          "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/sprites/disc.png",
          (texture) => resolve(texture),
          undefined, // onProgress callback không cần thiết
          (error) => {
            console.warn("Không thể tải texture, sử dụng texture dự phòng");
            // Tạo texture dự phòng đơn giản
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.arc(16, 16, 14, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            const fallbackTexture = new THREE.CanvasTexture(canvas);
            resolve(fallbackTexture);
          }
        );
      });

      console.log("Shader textures preloaded successfully");
    } catch (error) {
      console.error("Error preloading shader textures:", error);
      // Tạo texture dự phòng nếu có lỗi
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      this.particleTexture = new THREE.CanvasTexture(canvas);
    }
  }

  createHeart() {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, 0, 0, -50, 50, -50);
    heartShape.bezierCurveTo(100, -50, 100, 0, 100, 0);
    heartShape.bezierCurveTo(100, 50, 50, 100, 0, 150);
    heartShape.bezierCurveTo(-50, 100, -100, 50, -100, 0);
    heartShape.bezierCurveTo(-100, -50, -50, -50, 0, 0);

    const extrudeSettings = {
      depth: 35,
      bevelEnabled: true,
      bevelSegments: 20,
      steps: 7,
      bevelSize: 10,
      bevelThickness: 10
    };

    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xff6666),
      transmission: 0.98,
      opacity: 1,
      reflectivity: 1,
      roughness: 0,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0,
      ior: 2.7,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0xff2222),
      emissiveIntensity: 0.05
    });

    geometry.computeVertexNormals();

    this.heart = new THREE.Mesh(geometry, material);
    this.heart.position.set(0, 0, -200);
    this.heart.rotation.x = Math.PI / 4;
    this.heart.castShadow = true;
    this.heart.receiveShadow = true;
    this.scene.add(this.heart);

    this.camera.position.z = 500;
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const lights = [
      [1, 1, 1, 0xff4444],
      [-1, -1, -1, 0xffffff],
      [1, -1, 1, 0xff2222],
      [-1, 1, -1, 0xffffff]
    ];

    lights.forEach(([x, y, z, color]) => {
      const light = new THREE.DirectionalLight(color, 0.8);
      light.position.set(x * 250, y * 250, z * 250);
      this.scene.add(light);
    });

    const pointLight = new THREE.PointLight(0xff3333, 1.8, 800);
    pointLight.position.set(0, 0, 300);
    this.scene.add(pointLight);

    const additionalPointLight = new THREE.PointLight(0xffffff, 1.2, 600);
    additionalPointLight.position.set(0, 200, 0);
    this.scene.add(additionalPointLight);
  }

  setupEnvironment() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#112D60');    // Indigo at top
    gradient.addColorStop(0.4, '#1E3B7C');  // Mid indigo
    gradient.addColorStop(0.7, '#9B4F96');  // Mid purple
    gradient.addColorStop(1, '#DD83E0');    // Purple at bottom
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;  // Đảm bảo màu sắc chính xác
    texture.needsUpdate = true;

    this.scene.background = texture;
    this.scene.environment = null;

    this.renderer.toneMappingExposure = 1.0;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }

  createDolphinPendant() {
    const dolphinShape = new THREE.Shape();

    dolphinShape.moveTo(0, 0);
    dolphinShape.quadraticCurveTo(-20, 10, -40, 20);
    dolphinShape.quadraticCurveTo(-60, 40, -50, 60);
    dolphinShape.quadraticCurveTo(-40, 80, -20, 70);
    dolphinShape.lineTo(0, 50);
    dolphinShape.lineTo(20, 70);
    dolphinShape.quadraticCurveTo(40, 80, 50, 60);
    dolphinShape.quadraticCurveTo(60, 40, 40, 20);
    dolphinShape.quadraticCurveTo(20, 10, 0, 0);

    const extrudeSettings = {
      depth: 20,
      bevelEnabled: true,
      bevelSegments: 10,
      steps: 4,
      bevelSize: 5,
      bevelThickness: 5
    };

    const geometry = new THREE.ExtrudeGeometry(dolphinShape, extrudeSettings);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x6a5acd),
      metalness: 1,
      roughness: 0.2,
      reflectivity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transmission: 0.1,
      opacity: 0.95,
      ior: 1.7,
      iridescence: 1,
      iridescenceIOR: 1.5,
      specularIntensity: 1,
      specularColor: new THREE.Color(0x9370db),
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true
    });

    this.dolphinPendant = new THREE.Mesh(geometry, material);
    this.dolphinPendant.position.set(0, 0, -300);
    this.dolphinPendant.rotation.z = Math.PI / 2;
    this.dolphinPendant.scale.set(0.55, 0.55, 0.55);
    this.dolphinPendant.castShadow = true;
    this.scene.add(this.dolphinPendant);
  }

  createHeartPendant() {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, 0, 0, -50, 50, -50);
    heartShape.bezierCurveTo(100, -50, 100, 0, 100, 0);
    heartShape.bezierCurveTo(100, 50, 50, 100, 0, 150);
    heartShape.bezierCurveTo(-50, 100, -100, 50, -100, 0);
    heartShape.bezierCurveTo(-100, -50, -50, -50, 0, 0);

    const extrudeSettings = {
      depth: 20,
      bevelEnabled: true,
      bevelSegments: 10,
      steps: 4,
      bevelSize: 5,
      bevelThickness: 5
    };

    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x8a4fff),
      metalness: 1,
      roughness: 0.15,
      reflectivity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transmission: 0.1,
      opacity: 0.95,
      ior: 1.7,
      iridescence: 1,
      iridescenceIOR: 1.5,
      specularIntensity: 1,
      specularColor: new THREE.Color(0x7b68ee),
      side: THREE.DoubleSide
    });

    this.heartPendant = new THREE.Mesh(geometry, material);
    this.heartPendant.position.set(0, 0, -300);
    this.heartPendant.rotation.z = Math.PI * 0.8;
    this.heartPendant.scale.set(0.45, 0.45, 0.45);
    this.heartPendant.castShadow = true;
    this.scene.add(this.heartPendant);
  }

  createAdditionalHeartPendant(index) {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, 0, 0, -50, 50, -50);
    heartShape.bezierCurveTo(100, -50, 100, 0, 100, 0);
    heartShape.bezierCurveTo(100, 50, 50, 100, 0, 150);
    heartShape.bezierCurveTo(-50, 100, -100, 50, -100, 0);
    heartShape.bezierCurveTo(-100, -50, -50, -50, 0, 0);

    const extrudeSettings = {
      depth: 20,
      bevelEnabled: true,
      bevelSegments: 10,
      steps: 4,
      bevelSize: 5,
      bevelThickness: 5
    };

    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x8a4fff),
      metalness: 1,
      roughness: 0.15,
      reflectivity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transmission: 0.1,
      opacity: 0.95,
      ior: 1.7,
      iridescence: 1,
      iridescenceIOR: 1.5,
      specularIntensity: 1,
      specularColor: new THREE.Color(0x7b68ee),
      side: THREE.DoubleSide
    });

    const heart = new THREE.Mesh(geometry, material);
    heart.position.set(0, 0, -300);
    
    switch(index) {
        case 0:
            heart.scale.set(0.5, 0.5, 0.5);
            heart.rotation.z = Math.PI * 1.2;
            heart.rotation.x = Math.PI * 0.1;
            break;
        case 1:
            heart.scale.set(0.35, 0.35, 0.35);
            heart.rotation.z = Math.PI * 0.7;
            heart.rotation.y = Math.PI * 0.15;
            break;
        case 2:
            heart.scale.set(0.4, 0.4, 0.4);
            heart.rotation.z = Math.PI * 0.9;
            heart.rotation.x = -Math.PI * 0.05;
            break;
    }
    
    heart.castShadow = true;
    this.scene.add(heart);
    return heart;
  }

  initParticles() {
    this.particles = [];
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const velocities = [];

    for (let i = 0; i < 10000; i++) {
      const radius = Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.push(x, y, z);

      const hue = Math.random();
      const saturation = 0.5 + Math.random() * 0.5;
      const lightness = 0.5 + Math.random() * 0.5;

      colors.push(
        Math.cos(hue * Math.PI * 2) * 0.5 + 0.5,
        Math.cos(hue * Math.PI * 2 + 2) * 0.5 + 0.5,
        Math.cos(hue * Math.PI * 2 + 4) * 0.5 + 0.5
      );

      sizes.push(1 + Math.random() * 3);

      velocities.push(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute(
      "velocity",
      new THREE.Float32BufferAttribute(velocities, 3)
    );

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        musicEnergy: { value: 0 },
        pointTexture: {
          value:
            this.particleTexture ||
            new THREE.TextureLoader().load(
              "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/sprites/disc.png"
            )
        }
      },
      vertexShader: `
                attribute float size;
                attribute vec3 velocity;
                uniform float time;
                uniform float musicEnergy;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    vec3 newPosition = position;
                    
                    // Music-synchronized movement
                    float movementIntensity = musicEnergy * 50.0;
                    newPosition += velocity * movementIntensity * (sin(time * 2.0 + length(position) * 0.01) + 1.0) * 0.5;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + musicEnergy * 2.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
      fragmentShader: `
                uniform sampler2D pointTexture;
                uniform float musicEnergy;
                varying vec3 vColor;
                
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    
                    float alpha = smoothstep(0.5, 0.0, dist);
                    vec3 dynamicColor = vColor * (1.0 + musicEnergy * 2.0);
                    gl_FragColor = vec4(dynamicColor, alpha * (0.7 + musicEnergy * 0.3));
                }
            `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  initEventListeners() {
    document.addEventListener("mousemove", (e) => {
      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      this.heart.rotation.y = mouseX * 0.5;
      this.heart.rotation.x = mouseY * 0.3;
      this.camera.position.z = 450 + mouseY * 40;
      this.camera.position.x = mouseX * 40;
      this.camera.lookAt(this.heart.position);
    });
  }

  initAudioReactivity() {
    this.sound = new Howl({
      src: [
        "nhacnen.mp3"
      ],
      html5: true,
      pool: 1,
      volume: 0.05,
      onplay: () => {
        document.querySelector(".valentine-text").style.opacity = "1";
        document.querySelector(".loading-screen").style.opacity = "0";
      },
      onload: () => {
        document.querySelector(".loading-screen").style.opacity = "0";
      }
    });

    this.analyser = Howler.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    Howler.masterGain.connect(this.analyser);
    this.audioData = new Uint8Array(this.analyser.frequencyBinCount);

    this.energyHistory = new Array(30).fill(0.0001);
    this.beatCutoff = 0.25;
    this.beatThreshold = 1.4;
  }

  getFrequencyEnergy(startBin, endBin) {
    return (
      Array.from(this.audioData.slice(startBin, endBin)).reduce(
        (acc, val) => acc + val / 255,
        0
      ) /
      (endBin - startBin)
    );
  }

  detectBeat(energy, history) {
    const averageEnergy = history.reduce((a, b) => a + b) / history.length;
    const isBeat =
      energy > averageEnergy * this.beatThreshold && energy > this.beatCutoff;
    this.energyHistory = [...this.energyHistory.slice(1), energy];
    return isBeat;
  }

  animate() {
    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.audioData);

      const subBass = this.getFrequencyEnergy(0, 10);
      const bass = this.getFrequencyEnergy(10, 40);
      const lowMid = this.getFrequencyEnergy(40, 150);
      const mid = this.getFrequencyEnergy(150, 400);
      const highMid = this.getFrequencyEnergy(400, 900);
      const presence = this.getFrequencyEnergy(900, 1800);

      const beat = this.detectBeat(subBass + bass, this.energyHistory);

      const rotationIntensity = {
        heart: bass * 0.0005 + highMid * 0.0003,
        rings: mid * 0.001,
        dolphin: lowMid * 0.0007,
        heartPendant: presence * 0.0004
      };

      this.heart.rotation.y += rotationIntensity.heart * (beat ? 1.5 : 1);
      this.heart.rotation.x += rotationIntensity.heart * 0.6 * (beat ? 1.2 : 1);
      this.heart.rotation.z += subBass * 0.0003 * Math.sin(now * 0.001);

      this.heart.material.color.setHSL(
        (Math.cos(now * 0.0007) * 0.05 + 0.9) % 1,
        0.7 + mid * 0.4,
        0.5 + presence * 0.3
      );

      this.heart.scale.set(
        1 + subBass * 0.4,
        1 + subBass * 0.4,
        1 + subBass * 0.4
      );

      if (this.dolphinPendant) {
        const time1 = now * 0.0005;
        const orbitRadius1 = 280;
        
        const spinRotation1 = now * 0.001;
        
        this.dolphinPendant.position.x = Math.cos(time1) * orbitRadius1;
        this.dolphinPendant.position.y = Math.sin(time1 * 1.7) * (orbitRadius1 * 0.35);
        this.dolphinPendant.position.z = -150;

        this.dolphinPendant.rotation.x = Math.sin(spinRotation1) * 0.3 + Math.PI * 0.1;
        this.dolphinPendant.rotation.y = Math.cos(spinRotation1) * 0.3;
        this.dolphinPendant.rotation.z = spinRotation1 + Math.PI / 2;
      }

      if (this.heartPendant) {
        const time2 = now * 0.0005 + (Math.PI * 2/3);
        const orbitRadius2 = 260;
        
        const spinRotation2 = now * 0.0008;
        
        this.heartPendant.position.x = Math.cos(time2) * orbitRadius2;
        this.heartPendant.position.y = Math.sin(time2 * 1.5) * (orbitRadius2 * 0.45);
        this.heartPendant.position.z = -180;

        this.heartPendant.rotation.x = Math.sin(spinRotation2) * 0.4;
        this.heartPendant.rotation.y = Math.cos(spinRotation2) * 0.4;
        this.heartPendant.rotation.z = spinRotation2 * 0.5 + Math.PI * 0.8;
      }

      if (this.additionalHearts) {
        this.additionalHearts.forEach((heart, i) => {
          const time = now * 0.0005 + (Math.PI * 2/3) * (i + 2);
          const orbitRadius = 270 - i * 10;
          
          const spinRotation = now * (0.0006 + i * 0.0002);
          
          heart.position.x = Math.cos(time) * orbitRadius;
          heart.position.y = Math.sin(time * (1.6 + i * 0.1)) * (orbitRadius * 0.4);
          heart.position.z = -210 - i * 30;

          const baseRotation = [
            [Math.PI * 1.2, Math.PI * 0.1, 0],
            [Math.PI * 0.7, Math.PI * 0.1, 0],
            [Math.PI * 0.9, -Math.PI * 0.05, 0]
          ][i];

          heart.rotation.x = baseRotation[0] + Math.sin(spinRotation) * 0.3;
          heart.rotation.y = baseRotation[1] + Math.cos(spinRotation) * 0.3;
          heart.rotation.z = baseRotation[2] + spinRotation * 0.5;
        });
      }

      const positions = this.particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(now * 0.001 + i) * (presence * 0.7);
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;

      const baseScale = 1 + subBass * 0.4;
      const beatScale = beat ? 1.15 : 1;
      this.heart.scale.set(
        baseScale * beatScale,
        baseScale * beatScale,
        baseScale * beatScale
      );
    }

    this.heart.rotation.y += 0.007;
    this.heart.rotation.x += 0.004;
    this.heart.rotation.z += 0.002;

    const scale = 1 + Math.sin(Date.now() * 0.001) * 0.05;
    this.heart.scale.set(scale, scale, scale);

    if (Date.now() % 300 < delta * 1000) {
      this.createFloatingHeart();
    }

    if (this.particleSystem) {
      this.particleSystem.material.uniforms.time.value = Date.now() * 0.001;
    }

    const subBass = this.getFrequencyEnergy(0, 10);
    const bass = this.getFrequencyEnergy(10, 40);
    const musicEnergy = subBass + bass;

    if (this.particleSystem) {
      this.particleSystem.material.uniforms.musicEnergy.value = musicEnergy;
    }

    this.camera.position.z = 500;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  createFloatingHeart() {
    const heartGeometry = new THREE.SphereGeometry(2, 8, 8);
    const heartMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      transparent: true,
      opacity: 0.7
    });

    const heart = new THREE.Mesh(heartGeometry, heartMaterial);
    heart.position.set(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      -200
    );

    this.scene.add(heart);

    const speed = 0.1 + Math.random() * 0.2;
    const angle = Math.random() * Math.PI * 2;
    const radius = 50 + Math.random() * 100;

    const animate = () => {
      heart.position.x += Math.cos(angle) * speed;
      heart.position.y += Math.sin(angle) * speed;
      heart.position.z += speed * 2;
      heart.scale.multiplyScalar(0.99);
      heart.material.opacity *= 0.99;

      if (heart.material.opacity < 0.1) {
        this.scene.remove(heart);
        return;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  transitionToNewScene() {
    // Hiển thị loading screen trước
    const loadingScreen = document.querySelector('.loading-screen');
    loadingScreen.classList.add('visible');

    // Fade out âm nhạc
    if (this.sound) {
      this.sound.fade(1, 0, 1000);
    }

    // Đợi 1 giây để hiển thị loading
    setTimeout(() => {
      // Fade out scene hiện tại
      document.querySelector(".scene").style.opacity = "0";
      
      // Khởi tạo new scene sau 2 giây
      setTimeout(() => {
        const newScene = document.querySelector('.new-scene');
        if (newScene) {
          // Thêm hiệu ứng transition cho new scene
          newScene.style.transition = 'opacity 8s ease-in-out';
          newScene.classList.add('visible');
          
          // Ẩn loading screen sau khi new scene bắt đầu hiện
          setTimeout(() => {
            loadingScreen.classList.remove('visible');
          }, 500);

          // Thêm hiệu ứng fade in cho các phần tử trong new scene
          const newSceneText = newScene.querySelector('.valentine-text');
          if (newSceneText) {
            setTimeout(() => {
              newSceneText.style.opacity = "1";
            }, 1000);
          }
        }
      }, 2000);
    }, 1000);
  }
}

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    new DiamondHeart();
  }, 250);
});

function launchExperience() {
  // Hiển thị loading screen trước
  const loadingScreen = document.querySelector('.loading-screen');
  loadingScreen.classList.add('visible');

  // Đợi 1 giây để hiển thị loading
  setTimeout(() => {
    document.querySelector(".start-screen").style.opacity = "0";
    
    // Khởi tạo scene sau 2 giây
    setTimeout(() => {
      document.querySelector(".scene").style.opacity = "1";
      const diamondHeart = new DiamondHeart();
      document.querySelector('.scene')._diamondHeart = diamondHeart;
      diamondHeart.sound.play();

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }

      // Ẩn loading screen sau khi scene đã load
      loadingScreen.classList.remove('visible');
      
      // Xóa start screen
      document.querySelector(".start-screen").remove();
    }, 2000);
  }, 1000);
}

window.launchExperience = launchExperience;

window.transitionToNewScene = function() {
  const scene = document.querySelector('.scene');
  if (scene && scene._diamondHeart) {
    scene._diamondHeart.transitionToNewScene();
  }
};
