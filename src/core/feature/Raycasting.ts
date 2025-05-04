import { BatchedMesh, Box3, Intersection, Matrix4, Mesh, Ray, Raycaster, Sphere, Vector3 } from 'three';

declare module 'three' {
  interface BatchedMesh {
    /** @internal */ raycastInstances(raycaster: Raycaster, result: Intersection[]): void;
    /** @internal */ checkObjectIntersection(raycaster: Raycaster, objectIndex: number, result: Intersection[]): void;
  }
}

const _intersections: Intersection[] = [];
const _mesh = new Mesh();
const _ray = new Ray();
const _direction = new Vector3();
const _worldScale = new Vector3();
const _invMatrixWorld = new Matrix4();
const _sphere = new Sphere();

BatchedMesh.prototype.raycast = function (raycaster, result) {
  if (!this.material || this.instanceCount === 0) return;

  _mesh.geometry = this.geometry;
  _mesh.material = this.material;

  const originalRay = raycaster.ray;
  const originalNear = raycaster.near;
  const originalFar = raycaster.far;

  _invMatrixWorld.copy(this.matrixWorld).invert();

  _worldScale.setFromMatrixScale(this.matrixWorld);
  _direction.copy(raycaster.ray.direction).multiply(_worldScale);
  const scaleFactor = _direction.length();

  raycaster.ray = _ray.copy(raycaster.ray).applyMatrix4(_invMatrixWorld);
  raycaster.near /= scaleFactor;
  raycaster.far /= scaleFactor;

  this.raycastInstances(raycaster, result);

  raycaster.ray = originalRay;
  raycaster.near = originalNear;
  raycaster.far = originalFar;
};

BatchedMesh.prototype.raycastInstances = function (raycaster, result) {
  if (this.bvh) {
    this.bvh.raycast(raycaster, (instanceId) => this.checkObjectIntersection(raycaster, instanceId, result));
    // TODO test with three-mesh-bvh
  } else {
    if (this.boundingSphere === null) this.computeBoundingSphere();
    _sphere.copy(this.boundingSphere);
    if (!raycaster.ray.intersectsSphere(_sphere)) return;

    // TODO this._instanceInfo.length may change
    for (let i = 0, l = this._instanceInfo.length; i < l; i++) {
      this.checkObjectIntersection(raycaster, i, result);
    }
  }
};

BatchedMesh.prototype.checkObjectIntersection = function (raycaster, objectIndex, result) {
  const info = this._instanceInfo[objectIndex];
  if (!info.active || !info.visible) return;

  const geometryId = info.geometryIndex;
  const geometryInfo = this._geometryInfo[geometryId];
  _mesh.geometry.setDrawRange(geometryInfo.start, geometryInfo.count);

  _mesh.geometry.boundingBox ??= new Box3();
  _mesh.geometry.boundingSphere ??= new Sphere();

  this.getMatrixAt(objectIndex, _mesh.matrixWorld);
  this.getBoundingBoxAt(geometryId, _mesh.geometry.boundingBox); // TODO do we need both?
  this.getBoundingSphereAt(geometryId, _mesh.geometry.boundingSphere);

  _mesh.raycast(raycaster, _intersections);

  for (const intersect of _intersections) {
    intersect.batchId = objectIndex;
    intersect.object = this;
    result.push(intersect);
  }

  _intersections.length = 0;
};
