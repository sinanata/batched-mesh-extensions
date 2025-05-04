import { DataTexture } from 'three';

export * from './core/feature/GetPositionAt.js';
export * from './core/feature/Uniforms.js';
export * from './core/Patch.js';
export * from './core/utils/BatchedMeshBVH.js';
export * from './core/utils/SquareDataTexture.js';

/** @internal */
declare module 'three' {
  interface BatchedMesh {
    _instanceInfo: InstanceInfo[];
    _geometryInfo: GeometryInfo[];
    // _indirectTexture: DataTexture;
    _matricesTexture: DataTexture;
    // _multiDrawStarts: Float32Array;
    // _multiDrawCounts: Float32Array;
    // _multiDrawCount: number;
    // _visibilityChanged: boolean;
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
  start: number;
  count: number;
}
