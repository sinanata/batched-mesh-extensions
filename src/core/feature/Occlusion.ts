import { BatchedMesh } from 'three';

declare module 'three' {
  interface BatchedMesh {
    /**
     * Sets whether a specific instance can be culled by occlusion.
     * @param id The index of the instance.
     * @param occludable `true` if the instance can be occluded, `false` otherwise.
     */
    setOccludableAt(id: number, occludable: boolean): void;
  }
}

export function setOccludableAt(this: BatchedMesh, id: number, occludable: boolean): void {
  if (this._instanceInfo[id]) {
    this._instanceInfo[id].isOccludable = occludable;
  }
}
