import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BatchedMesh, BoxGeometry, Matrix4, MeshBasicMaterial, Scene, SphereGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import '../src/index.js';

const camera = new PerspectiveCameraAuto(50, 0.1, 100).translateZ(10);
const scene = new Scene();
const main = new Main(); // init renderer and other stuff
main.createView({ scene, camera });
const controls = new OrbitControls(camera, main.renderer.domElement);
controls.update();

const count = 1000000;
const box = new BoxGeometry(1, 1, 1);
const sphere = new SphereGeometry(1, 12, 12);
const material = new MeshBasicMaterial({ transparent: true, depthWrite: false });

const verticesCount = box.attributes.position.count + sphere.attributes.position.count;
const indexesCount = box.index.array.length + sphere.index.array.length;
const batchedMesh = new BatchedMesh(count, verticesCount, indexesCount, material);

const boxGeometryId = batchedMesh.addGeometry(box);
const sphereGeometryId = batchedMesh.addGeometry(sphere);

for (let i = 0; i < count; i++) {
  const id = batchedMesh.addInstance(i % 2 === 0 ? boxGeometryId : sphereGeometryId);
  batchedMesh.setMatrixAt(id, new Matrix4().makeTranslation(Math.random() * 1000 - 500, Math.random() * 1000 - 500, Math.random() * 1000 - 500));
}

scene.add(batchedMesh);

batchedMesh.computeBVH();
