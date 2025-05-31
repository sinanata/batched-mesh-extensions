import type { Box3, DataTexture, Sphere } from 'three';
import type { LODInfo } from './core/feature/LOD';

export * from './core/BatchedMeshBVH';
export * from './core/MultiDrawRenderList';
export * from './core/SquareDataTexture';

export * from './core/feature/ComputeBVH';
export * from './core/feature/FrustumCulling';
export * from './core/feature/GetPositionAt';
export * from './core/feature/LOD';
export * from './core/feature/Raycasting';
export * from './core/feature/Uniforms';

export * from './patch/ExtendsBatchedMeshPrototype.webgl';
export * from './patch/PatchBatchedMeshMaterial';

export * from './utils/CountUtils';
export * from './utils/SortingUtils';

/** @internal */
declare module 'three' {
  interface BatchedMesh {
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
}

/** @internal */
interface GeometryInfo {
  vertexStart: number;
  vertexCount: number;
  reservedVertexCount: number;

  indexStart: number;
  indexCount: number;
  reservedIndexCount: number;

  // draw range information (ignored if lods present)
  start: number;
  count: number;

  // state
  boundingBox: Box3;
  boundingSphere: Sphere;
  active: boolean;

  // LOD (extends from base)
  LOD: LODInfo[];
}
