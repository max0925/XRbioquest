import type { MapCollisionData } from '../../types/map-config.ts';

type Point2 = { x: number; z: number };

function distanceToSegmentSquared(point: Point2, start: Point2, end: Point2): number {
  const edgeX = end.x - start.x;
  const edgeZ = end.z - start.z;
  const lengthSquared = edgeX * edgeX + edgeZ * edgeZ;
  if (lengthSquared === 0) return (point.x - start.x) ** 2 + (point.z - start.z) ** 2;
  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * edgeX + (point.z - start.z) * edgeZ) / lengthSquared,
  ));
  const closestX = start.x + edgeX * projection;
  const closestZ = start.z + edgeZ * projection;
  return (point.x - closestX) ** 2 + (point.z - closestZ) ** 2;
}

export class MapCollisionWorld {
  readonly data: MapCollisionData;
  readonly radius: number;

  constructor(
    data: MapCollisionData,
    radius = 0.3,
  ) {
    if (!(radius > 0)) throw new Error('Player radius must be positive');
    this.data = data;
    this.radius = radius;
  }

  isFree(x: number, z: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const { bounds, boxes } = this.data;
    const radius = this.radius;
    if (
      x < bounds.minX + radius ||
      x > bounds.maxX - radius ||
      z < bounds.minZ + radius ||
      z > bounds.maxZ - radius
    ) return false;

    if (!this.isInsideIsland(x, z)) return false;

    return !boxes.some((box) =>
      x >= box.minX - radius && x <= box.maxX + radius &&
      z >= box.minZ - radius && z <= box.maxZ + radius,
    );
  }

  private isInsideIsland(x: number, z: number): boolean {
    const outline = this.data.island.outline;
    const point = { x, z };
    let inside = false;

    for (let index = 0, previous = outline.length - 1; index < outline.length; previous = index, index += 1) {
      const start = outline[previous];
      const end = outline[index];
      if (distanceToSegmentSquared(point, start, end) <= this.radius ** 2) return false;

      const crossesRay = (start.z > z) !== (end.z > z) &&
        x < ((end.x - start.x) * (z - start.z)) / (end.z - start.z) + start.x;
      if (crossesRay) inside = !inside;
    }
    return inside;
  }

  private coastlineSlide(x: number, z: number, dx: number, dz: number): Point2 | null {
    const outline = this.data.island.outline;
    const point = { x, z };
    let nearestStart = outline[outline.length - 1];
    let nearestEnd = outline[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0, previous = outline.length - 1; index < outline.length; previous = index, index += 1) {
      const start = outline[previous];
      const end = outline[index];
      const distance = distanceToSegmentSquared(point, start, end);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestStart = start;
        nearestEnd = end;
      }
    }

    const edgeX = nearestEnd.x - nearestStart.x;
    const edgeZ = nearestEnd.z - nearestStart.z;
    const edgeLength = Math.hypot(edgeX, edgeZ);
    if (edgeLength < 1e-8) return null;
    const tangentX = edgeX / edgeLength;
    const tangentZ = edgeZ / edgeLength;
    const alongEdge = dx * tangentX + dz * tangentZ;
    if (Math.abs(alongEdge) < 1e-8) return null;
    return { x: tangentX * alongEdge, z: tangentZ * alongEdge };
  }

  groundHeight(x: number, z: number): number {
    const { xs, ys, heights } = this.data.ground;
    const locate = (values: number[], value: number) => {
      let index = 0;
      while (index < values.length - 2 && value > values[index + 1]) index += 1;
      return index;
    };
    const gridY = -z;
    const xIndex = locate(xs, x);
    const yIndex = locate(ys, gridY);
    const u = Math.max(0, Math.min(1, (x - xs[xIndex]) / (xs[xIndex + 1] - xs[xIndex])));
    const v = Math.max(0, Math.min(1, (gridY - ys[yIndex]) / (ys[yIndex + 1] - ys[yIndex])));
    const a = heights[yIndex][xIndex];
    const b = heights[yIndex][xIndex + 1];
    const c = heights[yIndex + 1][xIndex];
    const d = heights[yIndex + 1][xIndex + 1];
    return u >= v
      ? a + (b - a) * u + (d - b) * v
      : a + (d - c) * u + (c - a) * v;
  }

  private segmentFree(x: number, z: number, endX: number, endZ: number): boolean {
    if (!this.isFree(x, z) || !this.isFree(endX, endZ)) return false;
    const dx = endX - x;
    const dz = endZ - z;

    for (const box of this.data.boxes) {
      let enter = 0;
      let exit = 1;
      const axes: Array<[number, number, number, number]> = [
        [x, dx, box.minX - this.radius, box.maxX + this.radius],
        [z, dz, box.minZ - this.radius, box.maxZ + this.radius],
      ];
      for (const [start, delta, min, max] of axes) {
        if (Math.abs(delta) < 1e-12) {
          if (start < min || start > max) {
            enter = 2;
            break;
          }
        } else {
          const first = (min - start) / delta;
          const second = (max - start) / delta;
          enter = Math.max(enter, Math.min(first, second));
          exit = Math.min(exit, Math.max(first, second));
        }
      }
      if (enter <= exit) return false;
    }
    return true;
  }

  move(position: { x: number; z: number }, dx: number, dz: number) {
    let { x, z } = position;
    if (![x, z, dx, dz].every(Number.isFinite)) throw new Error('Non-finite movement');
    if (!this.isFree(x, z)) throw new Error('Start position is outside walkable space');
    if (Math.hypot(dx, dz) > 100) return { x, y: this.groundHeight(x, z) + 0.06, z };

    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
    const stepX = dx / steps;
    const stepZ = dz / steps;
    for (let index = 0; index < steps; index += 1) {
      if (this.segmentFree(x, z, x + stepX, z + stepZ)) {
        x += stepX;
        z += stepZ;
      } else {
        const crossesCoastline = !this.isInsideIsland(x + stepX, z + stepZ);
        if (crossesCoastline) {
          const slide = this.coastlineSlide(x, z, stepX, stepZ);
          if (slide && this.segmentFree(x, z, x + slide.x, z + slide.z)) {
            x += slide.x;
            z += slide.z;
            continue;
          }
        }
        if (this.segmentFree(x, z, x + stepX, z)) x += stepX;
        if (this.segmentFree(x, z, x, z + stepZ)) z += stepZ;
      }
    }
    return { x, y: this.groundHeight(x, z) + 0.06, z };
  }
}
