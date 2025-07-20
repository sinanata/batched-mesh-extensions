import type { Box3, DataTexture, Sphere, Object3D } from 'three';
import type { LODInfo } from './core/feature/LOD.js';

import './shaders/ShaderChunks.js';

export * from './core/BatchedMeshBVH.js';
export * from './core/MultiDrawRenderList.js';
export * from './core/SquareDataTexture.js';

export * from './core/feature/ComputeBVH.js';
export * from './core/feature/FrustumCulling.js';
export * from './core/feature/GetPositionAt.js';
export * from './core/feature/LOD.js';
export * from './core/feature/Occlusion.js';
export * from './core/feature/Raycasting.js';
export * from './core/feature/Uniforms.js';
export * from './core/feature/Skeleton.js';

export * from './patch/ExtendBatchedMeshPrototype.webgl.js';
export * from './patch/PatchBatchedMeshMaterial.js';

export * from './utils/CountUtils.js';
export * from './utils/SortingUtils.js';

/** @internal */
declare module 'three' {
  interface BatchedMesh {
    occlusionMesh?: Object3D;
    _instanceInfo: InstanceInfo[];
    _geometryInfo: GeometryInfo[];
    _indirectTexture: DataTexture;
    _matricesTexture: DataTexture;
    _multiDrawStarts: Float32Array;
    _multiDrawCounts: Float32Array;
    _multiDrawCount: number;
    _visibilityChanged: boolean;
  }
}

/** @internal */
export interface InstanceInfo {
  visible: boolean;
  active: boolean;
  geometryIndex: number;
  isOccludable?: boolean;
}

/** @internal */
interface GeometryInfo {
  vertexStart: number;
  vertexCount: number;
  reservedVertexCount: number;

  indexStart: number;
  indexCount: number;
  reservedIndexCount: number;

  start: number;
  count: number;

  boundingBox: Box3;
  boundingSphere: Sphere;
  active: boolean;

  LOD: LODInfo[];
}
