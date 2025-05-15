export type MultiDrawRenderItem = { start: number; count: number; z: number; zSort?: number; index?: number };

/**
 * A class that creates and manages a list of render items, used to determine the rendering order based on depth.
 */
export class MultiDrawRenderList {
  /**
   * The main array that holds the list of render items for multi draw rendering.
   */
  public array: MultiDrawRenderItem[] = [];
  protected pool: MultiDrawRenderItem[] = [];

  /**
   * Adds a new render item to the list.
   * @param instanceId The unique instance id of the render item.
   * @param depth The depth value used for sorting or determining the rendering order.
   * @param start TODO.
   * @param count TODO.
   */
  public push(instanceId: number, depth: number, start: number, count: number): void {
    const pool = this.pool;
    const list = this.array;
    const index = list.length;

    if (index >= pool.length) {
      pool.push({ start: null, count: null, z: null, zSort: null, index: null });
    }

    const item = pool[index];
    item.index = instanceId;
    item.start = start;
    item.count = count;
    item.z = depth;

    list.push(item);
  }

  /**
   * Resets the render list by clearing the array.
   */
  public reset(): void {
    this.array.length = 0;
  }
}
