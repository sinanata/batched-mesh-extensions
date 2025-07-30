import { BVHNode } from 'bvh.js';
import { BatchedMesh, BufferGeometry, Camera, Frustum, Material, Matrix4, Scene, Sphere, Vector3, WebGLRenderer, Raycaster, Object3D } from 'three';
import { MultiDrawRenderItem, MultiDrawRenderList } from '../MultiDrawRenderList.js';
import { sortOpaque, sortTransparent } from '../../utils/SortingUtils.js';

export type CustomSortCallback = (list: MultiDrawRenderItem[]) => void;

export type OnFrustumEnterCallback = (index: number, camera: Camera, cameraLOD?: Camera, LODIndex?: number) => boolean;

declare module 'three' {
  interface BatchedMesh {
    occlusionMesh?: Object3D;
    occlusionTestRate?: number;
    _occlusionState?: Uint8Array;
    _occlusionTestCounter?: number;
    visibleInstances: Set<number>;
    onFrustumEnter?: OnFrustumEnterCallback;
    frustumCulling(camera: Camera, cameraLOD?: Camera): void;
    updateIndexArray(): void;
    updateRenderList(): void;
    BVHCulling(camera: Camera, cameraLOD: Camera): void;
    linearCulling(camera: Camera, cameraLOD: Camera): void;
  }
}

const _frustum = new Frustum();
const _renderList = new MultiDrawRenderList();
const _projScreenMatrix = new Matrix4();
const _invMatrixWorld = new Matrix4();
const _forward = new Vector3();
const _cameraPos = new Vector3();
const _cameraWorldPos = new Vector3();
const _cameraLODPos = new Vector3();
const _position = new Vector3();
const _sphere = new Sphere();
const _tempMatrix = new Matrix4();
const _occlusionRaycaster = new Raycaster();

export function onBeforeRender(this: BatchedMesh, renderer: WebGLRenderer, scene: Scene, camera: Camera, geometry: BufferGeometry, material: Material, group: any): void {
  this.frustumCulling(camera);
}

export function frustumCulling(this: BatchedMesh, camera: Camera, cameraLOD = camera): void {
  if (!this._visibilityChanged && !this.perObjectFrustumCulled && !this.sortObjects) {
    return;
  }

  this._indirectTexture.needsUpdate = true;
  this._visibilityChanged = false;

  const sortObjects = this.sortObjects;
  const perObjectFrustumCulled = this.perObjectFrustumCulled;

  this.visibleInstances = this.visibleInstances ?? new Set<number>();
  this.visibleInstances.clear();

  if (!perObjectFrustumCulled && !sortObjects) {
    this.updateIndexArray();
    return;
  }

  this.occlusionTestRate = this.occlusionTestRate ?? 4;
  this._occlusionTestCounter = this._occlusionTestCounter ?? 0;
  if (!this._occlusionState || this._occlusionState.length < this.maxInstanceCount) {
    this._occlusionState = new Uint8Array(this.maxInstanceCount);
    this._occlusionState.fill(0);
  }

  _invMatrixWorld.copy(this.matrixWorld).invert();
  _cameraPos.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_invMatrixWorld);
  _cameraWorldPos.setFromMatrixPosition(camera.matrixWorld);
  _cameraLODPos.setFromMatrixPosition(cameraLOD.matrixWorld).applyMatrix4(_invMatrixWorld);
  _forward.set(0, 0, -1).transformDirection(camera.matrixWorld).transformDirection(_invMatrixWorld);

  if (!perObjectFrustumCulled) {
    this.updateRenderList();
  } else {
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.matrixWorld);

    if (this.bvh) this.BVHCulling(camera, cameraLOD);
    else this.linearCulling(camera, cameraLOD);
  }

  if (sortObjects) {
    const index = this.geometry.getIndex();
    const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;
    const multiDrawStarts = this._multiDrawStarts;
    const multiDrawCounts = this._multiDrawCounts;
    const indirectArray = this._indirectTexture.image.data as unknown as number[];
    const customSort = this.customSort as unknown as CustomSortCallback;

    if (customSort === null) {
      _renderList.array.sort(!this.material.transparent ? sortOpaque : sortTransparent);
    } else {
      customSort(_renderList.array);
    }

    const list = _renderList.array;
    const count = list.length;
    for (let i = 0; i < count; i++) {
      const item = list[i];
      multiDrawStarts[i] = item.start * bytesPerElement;
      multiDrawCounts[i] = item.count;
      indirectArray[i] = item.index;
    }

    _renderList.reset();
  }

  this._occlusionTestCounter = (this._occlusionTestCounter + 1) % this.occlusionTestRate;
}

export function updateIndexArray(this: BatchedMesh): void {
  if (!this._visibilityChanged) return;

  const index = this.geometry.getIndex();
  const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;
  const multiDrawStarts = this._multiDrawStarts;
  const multiDrawCounts = this._multiDrawCounts;
  const indirectArray = this._indirectTexture.image.data as unknown as number[];
  let count = 0;

  for (let i = 0, l = instanceInfo.length; i < l; i++) {
    const instance = instanceInfo[i];
    if (instance.visible && instance.active) {
      const geometryId = instance.geometryIndex;
      const geometryInfo = geometryInfoList[geometryId];

      multiDrawStarts[count] = geometryInfo.start * bytesPerElement;
      multiDrawCounts[count] = geometryInfo.count;
      indirectArray[count] = i;
      count++;
    }
  }

  this._multiDrawCount = count;
}

export function updateRenderList(this: BatchedMesh): void {
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;

  for (let i = 0, l = instanceInfo.length; i < l; i++) {
    const instance = instanceInfo[i];
    if (instance.visible && instance.active) {
      const geometryId = instance.geometryIndex;
      const geometryInfo = geometryInfoList[geometryId];
      const depth = this.getPositionAt(i, _position).sub(_cameraPos).dot(_forward);
      _renderList.push(i, depth, geometryInfo.start, geometryInfo.count);
    }
  }

  this._multiDrawCount = _renderList.array.length;
}

export function BVHCulling(this: BatchedMesh, camera: Camera, cameraLOD: Camera): void {
  const indexArr = this.geometry.getIndex();
  const bytesPerElement = indexArr === null ? 1 : indexArr.array.BYTES_PER_ELEMENT;
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;
  const sortObjects = this.sortObjects;
  const multiDrawStarts = this._multiDrawStarts;
  const multiDrawCounts = this._multiDrawCounts;
  const indirectArray = this._indirectTexture.image.data as unknown as number[];
  const onFrustumEnter = this.onFrustumEnter;
  let instancesCount = 0;

  const occlusionTestRate = this.occlusionTestRate!;
  const occlusionTestCounter = this._occlusionTestCounter!;
  const occlusionState = this._occlusionState!;
  const MIN_OCCLUSION_DISTANCE_SQ = 25 * 25;

  this.bvh.frustumCulling(_projScreenMatrix, (node: BVHNode<{}, number>) => {
    const index = node.object;
    const instance = instanceInfo[index];

    if (!instance.visible) return;

    if (this.occlusionMesh && instance.isOccludable !== false) {
      const isTestFrame = (index % occlusionTestRate) === occlusionTestCounter;

      if (isTestFrame) {
        this.getBoundingSphereAt(instance.geometryIndex, _sphere).applyMatrix4(this.getMatrixAt(index, _tempMatrix));
        const camToObjDistSq = _cameraWorldPos.distanceToSquared(_sphere.center);
        _sphere.radius *= 1.5;

        if (camToObjDistSq < MIN_OCCLUSION_DISTANCE_SQ) {
          occlusionState[index] = 0;
        } else {
          _occlusionRaycaster.ray.origin.copy(_cameraWorldPos);
          _occlusionRaycaster.ray.direction.copy(_sphere.center).sub(_cameraWorldPos);
          const distanceToTarget = _occlusionRaycaster.ray.direction.length();
          _occlusionRaycaster.ray.direction.normalize();
          _occlusionRaycaster.far = distanceToTarget - _sphere.radius;

          let isOccluded = false;
          if (_occlusionRaycaster.far > 0.1) {
            const intersects = _occlusionRaycaster.intersectObject(this.occlusionMesh, false);
            if (intersects.length > 0) {
              isOccluded = true;
            }
          }
          occlusionState[index] = isOccluded ? 1 : 0;
        }
      }

      if (occlusionState[index] === 1) {
        return;
      }
    }

    this.visibleInstances.add(index);

    const geometryId = instance.geometryIndex;
    const geometryInfo = geometryInfoList[geometryId];
    const LOD = geometryInfo.LOD;
    let start: number;
    let count: number;

    if (LOD) {
      const distance = this.getPositionAt(index, _position).distanceToSquared(_cameraLODPos);
      const LODIndex = this.getLODIndex(LOD, distance);
      if (onFrustumEnter && !onFrustumEnter(index, camera, cameraLOD, LODIndex)) return;
      start = LOD[LODIndex].start;
      count = LOD[LODIndex].count;
    } else {
      if (onFrustumEnter && !onFrustumEnter(index, camera)) return;
      start = geometryInfo.start;
      count = geometryInfo.count;
    }

    if (sortObjects) {
      const depth = this.getPositionAt(index, _position).sub(_cameraPos).dot(_forward);
      _renderList.push(index, depth, start, count);
    } else {
      multiDrawStarts[instancesCount] = start * bytesPerElement;
      multiDrawCounts[instancesCount] = count;
      indirectArray[instancesCount] = index;
      instancesCount++;
    }
  });

  this._multiDrawCount = sortObjects ? _renderList.array.length : instancesCount;
}

export function linearCulling(this: BatchedMesh, camera: Camera, cameraLOD: Camera): void {
  const index = this.geometry.getIndex();
  const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;
  const sortObjects = this.sortObjects;
  const multiDrawStarts = this._multiDrawStarts;
  const multiDrawCounts = this._multiDrawCounts;
  const indirectArray = this._indirectTexture.image.data as unknown as number[];
  const onFrustumEnter = this.onFrustumEnter;
  let instancesCount = 0;

  const occlusionTestRate = this.occlusionTestRate!;
  const occlusionTestCounter = this._occlusionTestCounter!;
  const occlusionState = this._occlusionState!;
  const MIN_OCCLUSION_DISTANCE_SQ = 25 * 25;

  _frustum.setFromProjectionMatrix(_projScreenMatrix);

  for (let i = 0, l = instanceInfo.length; i < l; i++) {
    const instance = instanceInfo[i];
    if (!instance.visible || !instance.active) continue;

    const geometryId = instance.geometryIndex;
    const geometryInfo = geometryInfoList[geometryId];
    this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(this.getMatrixAt(i, _tempMatrix));

    if (!_frustum.intersectsSphere(_sphere)) continue;

    if (this.occlusionMesh && instance.isOccludable !== false) {
      const isTestFrame = (i % occlusionTestRate) === occlusionTestCounter;
      if (isTestFrame) {
        const camToObjDistSq = _cameraWorldPos.distanceToSquared(_sphere.center);
        if (camToObjDistSq < MIN_OCCLUSION_DISTANCE_SQ) {
          occlusionState[i] = 0;
        } else {
          _occlusionRaycaster.ray.origin.copy(_cameraWorldPos);
          _occlusionRaycaster.ray.direction.copy(_sphere.center).sub(_cameraWorldPos);
          const distanceToTarget = _occlusionRaycaster.ray.direction.length();
          _occlusionRaycaster.ray.direction.normalize();
          _occlusionRaycaster.far = distanceToTarget - _sphere.radius;

          let isOccluded = false;
          if (_occlusionRaycaster.far > 0.1) {
            const intersects = _occlusionRaycaster.intersectObject(this.occlusionMesh, false);
            if (intersects.length > 0) {
              isOccluded = true;
            }
          }
          occlusionState[i] = isOccluded ? 1 : 0;
        }
      }

      if (occlusionState[i] === 1) {
        continue;
      }
    }

    this.visibleInstances.add(i);

    const LOD = geometryInfo.LOD;
    let start: number;
    let count: number;

    if (LOD) {
      const distance = _sphere.center.distanceToSquared(_cameraLODPos);
      const LODIndex = this.getLODIndex(LOD, distance);
      if (onFrustumEnter && !onFrustumEnter(i, camera, cameraLOD, LODIndex)) continue;
      start = LOD[LODIndex].start;
      count = LOD[LODIndex].count;
    } else {
      if (onFrustumEnter && !onFrustumEnter(i, camera)) continue;
      start = geometryInfo.start;
      count = geometryInfo.count;
    }

    if (sortObjects) {
      const depth = _position.subVectors(_sphere.center, _cameraPos).dot(_forward);
      _renderList.push(i, depth, start, count);
    } else {
      multiDrawStarts[instancesCount] = start * bytesPerElement;
      multiDrawCounts[instancesCount] = count;
      indirectArray[instancesCount] = i;
      instancesCount++;
    }
  }

  this._multiDrawCount = sortObjects ? _renderList.array.length : instancesCount;
}
