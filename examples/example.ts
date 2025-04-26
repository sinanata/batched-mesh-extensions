import { BatchedMesh, BoxGeometry, Matrix4, MeshBasicMaterial, Scene, SphereGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { patchBatchedMeshMaterial } from '../src/index.js';

const camera = new PerspectiveCameraAuto().translateZ(10);
const scene = new Scene();
const main = new Main(); // init renderer and other stuff
main.createView({ scene, camera });
const controls = new OrbitControls(camera, main.renderer.domElement);
controls.update();

const box = new BoxGeometry(1, 1, 1);
const sphere = new SphereGeometry(1, 12, 12);
const material = new MeshBasicMaterial({ transparent: true, depthWrite: false });

// initialize and add geometries into the batched mesh
const batchedMesh = new BatchedMesh(10, 5000, 10000, material);

patchBatchedMeshMaterial(batchedMesh);

const boxGeometryId = batchedMesh.addGeometry(box);
const sphereGeometryId = batchedMesh.addGeometry(sphere);

// create instances of those geometries
const boxInstancedId1 = batchedMesh.addInstance(boxGeometryId);
const boxInstancedId2 = batchedMesh.addInstance(boxGeometryId);

const sphereInstancedId1 = batchedMesh.addInstance(sphereGeometryId);
const sphereInstancedId2 = batchedMesh.addInstance(sphereGeometryId);

// position the geometries
batchedMesh.setMatrixAt(boxInstancedId1, new Matrix4().makeTranslation(-1, -1, 0));
batchedMesh.setMatrixAt(boxInstancedId2, new Matrix4().makeTranslation(-1, 1, 0));

batchedMesh.setMatrixAt(sphereInstancedId1, new Matrix4().makeTranslation(1, -1, 0));
batchedMesh.setMatrixAt(sphereInstancedId2, new Matrix4().makeTranslation(1, 1, 0));

batchedMesh.initUniformsPerInstance({ fragment: { diffuse: 'vec3', opacity: 'float' } });

batchedMesh.setUniformAt(0, 'diffuse', new Vector3(1, 0, 0));
batchedMesh.setUniformAt(1, 'diffuse', new Vector3(0, 1, 0));
batchedMesh.setUniformAt(2, 'diffuse', new Vector3(0, 0, 1));
batchedMesh.setUniformAt(3, 'diffuse', new Vector3(1, 1, 0));

batchedMesh.setUniformAt(0, 'opacity', 0.5);
batchedMesh.setUniformAt(1, 'opacity', 0.5);
batchedMesh.setUniformAt(2, 'opacity', 0.5);
batchedMesh.setUniformAt(3, 'opacity', 0.5);


scene.add(batchedMesh);
