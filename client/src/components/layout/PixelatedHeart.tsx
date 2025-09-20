import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const PixelatedHeart = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Heart shape pattern (16x16 grid)
  const heartPattern = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  // Purple shades instead of red
  const purpleShades = [
    '#e1bee7', // light lavender
    '#ba68c8', // medium purple
    '#9c27b0', // standard purple
    '#8e24aa', // darker purple
    '#6a1b9a', // deep purple
    '#4a148c'  // darkest purple
  ];

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear any existing content
    if (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(400, 400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 10);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    scene.add(light);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Shadow ground
    const ground = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const groundMesh = new THREE.Mesh(ground, groundMat);
    groundMesh.position.z = -0.5;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Heart squares
    const squares: THREE.Mesh[] = [];
    const squareGeometry = new THREE.PlaneGeometry(0.8, 0.8);

    heartPattern.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 1) {
          const shadeIndex = Math.floor(Math.random() * purpleShades.length);
          const material = new THREE.MeshStandardMaterial({
            color: purpleShades[shadeIndex],
            roughness: 0.4,
            metalness: 0.2,
          });

          const square = new THREE.Mesh(squareGeometry, material);
          square.castShadow = true;

          square.position.x = (colIndex - 7.5) * 0.9;
          square.position.y = (7.5 - rowIndex) * 0.9;
          square.position.z = Math.random() * 0.2;

          square.userData = {
            originalY: square.position.y,
            originalX: square.position.x,
            animationOffset: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.02,
          };

          scene.add(square);
          squares.push(square);
        }
      });
    });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      squares.forEach((square, index) => {
        square.position.y =
          square.userData.originalY +
          Math.sin(time * square.userData.pulseSpeed + square.userData.animationOffset) * 0.15;

        square.rotation.z = Math.sin(time * 0.5 + index * 0.3) * 0.03;

        square.position.x =
          square.userData.originalX +
          Math.cos(time * square.userData.pulseSpeed * 0.5 + square.userData.animationOffset) * 0.05;

        (square.material as THREE.MeshStandardMaterial).opacity = 0.85 + Math.sin(time + square.userData.animationOffset) * 0.15;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      squares.forEach((square) => {
        if (square.geometry) square.geometry.dispose();
        if (square.material) (square.material as THREE.MeshStandardMaterial).dispose();
      });
      if (sceneRef.current) {
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
      }
      if (mountRef.current?.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div
        ref={mountRef}
        style={{ width: '400px', height: '400px' }}
      />
    </div>
  );
};

export default PixelatedHeart;
