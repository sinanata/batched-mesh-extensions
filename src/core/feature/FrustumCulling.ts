import { BVHNode } from 'bvh.js';
import { BatchedMesh, BufferGeometry, Camera, Frustum, Material, Matrix4, Scene, Sphere, Vector3, WebGLRenderer } from 'three';
import { MultiDrawRenderItem, MultiDrawRenderList } from '../utils/MultiDrawRenderList.js';
import { sortOpaque, sortTransparent } from '../utils/SortingUtils.js';

// TODO: add LODs
// TODO: multidraw array change size to pass to gpu

/**
 * A custom sorting callback for render items.
 */
export type CustomSortCallback = (list: MultiDrawRenderItem[]) => void;

/**
 * Callback invoked when an instance is within the frustum.
 * @param index The index of the instance.
 * @param camera The camera used for rendering.
 * @returns True if the instance should be rendered, false otherwise.
 */
export type OnFrustumEnterCallback = (index: number, camera: Camera) => boolean;

declare module 'three' {
  interface BatchedMesh {
    /**
     * Callback function called if an instance is inside the frustum.
     */
    onFrustumEnter: OnFrustumEnterCallback;

    /**
     * Performs frustum culling and sorting.
     * @param camera The main camera used for rendering.
     */
    performFrustumCulling(camera: Camera): void;

    /** @internal */ frustumCulling(camera: Camera): void;
    /** @internal */ updateIndexArray(): void;
    /** @internal */ updateRenderList(): void;
    /** @internal */ BVHCulling(camera: Camera): void;
    /** @internal */ linearCulling(camera: Camera): void;
  }
}

const _frustum = new Frustum();
const _renderList = new MultiDrawRenderList();
const _projScreenMatrix = new Matrix4();
const _invMatrixWorld = new Matrix4();
const _forward = new Vector3();
const _cameraPos = new Vector3();
const _position = new Vector3();
const _sphere = new Sphere();

BatchedMesh.prototype.onBeforeRender = function (renderer: WebGLRenderer, scene: Scene, camera: Camera, geometry: BufferGeometry, material: Material, group: any): void {
  // TODO add autoupdate flag
  this.performFrustumCulling(camera);
};

BatchedMesh.prototype.performFrustumCulling = function (camera: Camera) {
  if (!this._visibilityChanged && !this.perObjectFrustumCulled && !this.sortObjects) {
    return;
  }

  this.frustumCulling(camera);
  this._indirectTexture.needsUpdate = true;
  this._visibilityChanged = false;
};

BatchedMesh.prototype.frustumCulling = function (camera: Camera) {
  const sortObjects = this.sortObjects;
  const perObjectFrustumCulled = this.perObjectFrustumCulled;

  if (!perObjectFrustumCulled && !sortObjects) {
    return this.updateIndexArray();
  }

  if (sortObjects) {
    _invMatrixWorld.copy(this.matrixWorld).invert();
    _cameraPos.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_invMatrixWorld);
    _forward.set(0, 0, -1).transformDirection(camera.matrixWorld).transformDirection(_invMatrixWorld);
  }

  if (!perObjectFrustumCulled) {
    this.updateRenderList();
  } else {
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.matrixWorld);

    if (this.bvh) this.BVHCulling(camera);
    else this.linearCulling(camera);
  }

  if (sortObjects) {
    const index = this.geometry.getIndex();
    const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;
    const multiDrawStarts = this._multiDrawStarts;
    const multiDrawCounts = this._multiDrawCounts;
    const indirectArray = this._indirectTexture.image.data;
    const customSort = this.customSort as unknown as CustomSortCallback;

    if (customSort === null) {
      _renderList.array.sort(!this.material.transparent ? sortOpaque : sortTransparent);
    } else {
      customSort(_renderList.array); // TODO fix and remove second useless parameter... make a PR on main repo
    }

    const list = _renderList.array;
    const count = list.length;
    for (let i = 0; i < count; i++) {
      const item = list[i];
      multiDrawStarts[i] = item.start * bytesPerElement; // TODO multiply bytesPerElement in the renderList?
      multiDrawCounts[i] = item.count;
      indirectArray[i] = item.index;
    }

    _renderList.reset();
  }
};

BatchedMesh.prototype.updateIndexArray = function () {
  if (!this._visibilityChanged) return this._multiDrawCount;

  const index = this.geometry.getIndex();
  const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;
  const multiDrawStarts = this._multiDrawStarts;
  const multiDrawCounts = this._multiDrawCounts;
  const indirectArray = this._indirectTexture.image.data;
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
};

BatchedMesh.prototype.updateRenderList = function () {
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;

  for (let i = 0, l = instanceInfo.length; i < l; i++) {
    const instance = instanceInfo[i];
    if (instance.visible && instance.active) {
      const geometryId = instance.geometryIndex;
      const geometryInfo = geometryInfoList[geometryId];
      const depth = this.getPositionAt(i).sub(_cameraPos).dot(_forward); // getPosition instead of _sphere.center
      _renderList.push(i, depth, geometryInfo.start, geometryInfo.count);
    }
  }

  this._multiDrawCount = _renderList.array.length;
};

BatchedMesh.prototype.BVHCulling = function (camera: Camera) {
  const index = this.geometry.getIndex();
  const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;
  const instanceInfo = this._instanceInfo;
  const geometryInfoList = this._geometryInfo;
  const sortObjects = this.sortObjects;
  const multiDrawStarts = this._multiDrawStarts;
  const multiDrawCounts = this._multiDrawCounts;
  const indirectArray = this._indirectTexture.image.data;
  const onFrustumEnter = this.onFrustumEnter;
  let count = 0;

  this.bvh.frustumCulling(_projScreenMatrix, (node: BVHNode<{}, number>) => {
    const index = node.object;
    const instance = instanceInfo[index];

    // TODO how to index < instancesArrayCount?

    // we don't check if active because we remove inactive instances from BVH
    if (instance.visible && (!onFrustumEnter || onFrustumEnter(index, camera))) {
      const geometryId = instance.geometryIndex;
      const geometryInfo = geometryInfoList[geometryId];

      if (sortObjects) {
        const depth = this.getPositionAt(index).sub(_cameraPos).dot(_forward);
        _renderList.push(index, depth, geometryInfo.start, geometryInfo.count);
      } else {
        multiDrawStarts[count] = geometryInfo.start * bytesPerElement;
        multiDrawCounts[count] = geometryInfo.count;
        indirectArray[count] = index;
        count++;
      }
    }
  });

  this._multiDrawCount = sortObjects ? _renderList.array.length : count;
};

BatchedMesh.prototype.linearCulling = function (camera: Camera) {
  // const array = this.instanceIndex.array;
  // if (!this.geometry.boundingSphere) this.geometry.computeBoundingSphere();
  // const bSphere = this._geometry.boundingSphere;
  // const radius = bSphere.radius;
  // const center = bSphere.center;
  // const instancesArrayCount = this._instancesArrayCount;
  // const geometryCentered = center.x === 0 && center.y === 0 && center.z === 0;
  // const sortObjects = this._sortObjects;
  // const onFrustumEnter = this.onFrustumEnter;
  // let count = 0;

  // _frustum.setFromProjectionMatrix(_projScreenMatrix);

  // for (let i = 0; i < instancesArrayCount; i++) {
  //   if (!this.getActiveAndVisibilityAt(i)) continue;

  //   if (geometryCentered) {
  //     const maxScale = this.getPositionAndMaxScaleOnAxisAt(i, _sphere.center);
  //     _sphere.radius = radius * maxScale;
  //   } else {
  //     this.applyMatrixAtToSphere(i, _sphere, center, radius);
  //   }

  //   if (_frustum.intersectsSphere(_sphere) && (!onFrustumEnter || onFrustumEnter(i, camera))) {
  //     if (sortObjects) {
  //       const depth = _position.subVectors(_sphere.center, _cameraPos).dot(_forward);
  //       _renderList.push(depth, i);
  //     } else {
  //       array[count++] = i;
  //     }
  //   }
  // }

  // this._multiDrawCount = sortObjects ? _renderList.array.length : count;
};
