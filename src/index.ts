import { type Vector3 } from 'three';

export * from './core/feature/Uniforms.js';
export * from './core/utils/BatchedMeshBVH.js';
export * from './core/utils/SquareDataTexture.js';
export * from './core/Patch.js';

/** @internal */
declare module 'three' {
  interface BatchedMesh {
    _instanceInfo: InstanceInfo[];
    _geometryInfo: GeometryInfo[];
    // _indirectTexture: DataTexture;
    // _multiDrawStarts: Float32Array;
    // _multiDrawCounts: Float32Array;
    // _multiDrawCount: number;
    // _visibilityChanged: boolean;
    // _matricesTexture: DataTexture;
    getPositionAt(index: number): Vector3;
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
