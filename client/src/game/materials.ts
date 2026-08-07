import * as THREE from "three";
import type { ArenaCollider, MapName } from "@veck/shared";
import { fbm, ridged, worley } from "./procgen";

export type SurfaceType = "concrete" | "plaster" | "metal" | "wood" | "dirt" | "sand" | "grass" | "stone" | "tile" | "glass";

const TILE_METRES = 2;
const textureSets = new Map<string, TextureSet>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const geometryCache = new Map<string, THREE.BoxGeometry>();
let totalBakeMs = 0;

type TextureSet = { albedo: THREE.DataTexture; normal: THREE.DataTexture; roughness: THREE.DataTexture; ao: THREE.DataTexture };
type Recipe = { seed: number; relief: number; roughness: [number, number]; metalness: 0 | 1; cells?: number; grain?: boolean; painted?: boolean };

const RECIPES: Record<SurfaceType, Recipe> = {
  concrete: { seed: 11, relief: 0.055, roughness: [0.72, 0.98], metalness: 0, cells: 7 },
  plaster: { seed: 23, relief: 0.025, roughness: [0.62, 0.9], metalness: 0, painted: true },
  metal: { seed: 37, relief: 0.012, roughness: [0.3, 0.68], metalness: 1, cells: 9, painted: true },
  wood: { seed: 41, relief: 0.032, roughness: [0.58, 0.88], metalness: 0, grain: true },
  dirt: { seed: 53, relief: 0.085, roughness: [0.82, 1], metalness: 0 },
  sand: { seed: 61, relief: 0.06, roughness: [0.78, 0.98], metalness: 0 },
  grass: { seed: 71, relief: 0.07, roughness: [0.8, 1], metalness: 0, grain: true },
  stone: { seed: 83, relief: 0.07, roughness: [0.75, 0.98], metalness: 0, cells: 6 },
  tile: { seed: 97, relief: 0.024, roughness: [0.38, 0.72], metalness: 0, cells: 8 },
  glass: { seed: 101, relief: 0.002, roughness: [0.12, 0.28], metalness: 0 }
};

const TEXTURE_FAMILY: Record<SurfaceType, SurfaceType> = {
  concrete: "concrete", stone: "concrete", tile: "concrete",
  plaster: "concrete", glass: "concrete", metal: "concrete",
  dirt: "dirt", sand: "dirt", grass: "dirt", wood: "dirt"
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (lo: number, hi: number, value: number) => {
  const t = clamp01((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

function dataTexture(data: Uint8Array, colorSpace: THREE.ColorSpace, textureSize: number) {
  const texture = new THREE.DataTexture(data, textureSize, textureSize, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = colorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function bakeSurface(surface: SurfaceType, textureSize: number): TextureSet {
  const started = performance.now();
  const recipe = RECIPES[surface];
  const pixels = textureSize * textureSize;
  const height = new Float32Array(pixels);
  const rough = new Float32Array(pixels);
  const albedo = new Uint8Array(pixels * 4);
  const normals = new Uint8Array(pixels * 4);
  const roughness = new Uint8Array(pixels * 4);
  const ao = new Uint8Array(pixels * 4);
  const period = 8;

  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const i = y * textureSize + x;
      const u = x / textureSize * period;
      const v = y / textureSize * period;
      const broad = fbm(u, v, period, recipe.seed, 2);
      const fine = fbm(u * 2, v * 2, period * 2, recipe.seed + 17, 1);
      let h = 0.28 + broad * 0.46 + fine * 0.26;
      let crack = 0;
      if (recipe.cells) {
        const cellU = u * recipe.cells / period;
        const cellV = v * recipe.cells / period;
        const [first, second] = worley(cellU, cellV, recipe.cells, recipe.seed + 29);
        crack = 1 - smoothstep(0.025, 0.09, second - first);
        h -= crack * (surface === "tile" ? 0.42 : 0.18);
      }
      if (recipe.grain) {
        const lines = surface === "wood" ? Math.sin((u + fbm(u, v, period, recipe.seed + 7, 2) * 0.7) * Math.PI * 3) : ridged(u * 3, v, period * 3, recipe.seed + 9);
        h += lines * 0.09;
      }
      h = clamp01(h);
      height[i] = h;
      const cavity = 1 - smoothstep(0.34, 0.58, h);
      const band = broad < 0.42 ? 0.78 : broad > 0.62 ? 1.08 : 0.94;
      let neutral = band * (0.9 + (fine - 0.5) * 0.16);
      neutral *= 1 - cavity * 0.35 - crack * 0.28;
      if (surface === "metal" && recipe.painted) neutral *= 0.92 + (1 - crack) * 0.08;
      // Stored as sRGB: 0.15..0.93 decodes to roughly the 0.02..0.85 linear quality range.
      const byte = Math.round(Math.max(0.15, Math.min(0.93, neutral)) * 255);
      const p = i * 4;
      albedo[p] = albedo[p + 1] = albedo[p + 2] = byte;
      albedo[p + 3] = 255;
      rough[i] = clamp01(recipe.roughness[0] + (recipe.roughness[1] - recipe.roughness[0]) * (0.35 + fine * 0.65) - crack * 0.08);
      const rByte = Math.round(rough[i] * 255);
      roughness[p] = roughness[p + 1] = roughness[p + 2] = rByte;
      roughness[p + 3] = 255;
      const aoByte = Math.round(clamp01(1 - cavity * 0.3 - crack * 0.25) * 255);
      ao[p] = ao[p + 1] = ao[p + 2] = aoByte;
      ao[p + 3] = 255;
    }
  }

  const texel = 1 / textureSize;
  const strength = recipe.relief / TILE_METRES;
  const sample = (x: number, y: number) => height[((y + textureSize) % textureSize) * textureSize + ((x + textureSize) % textureSize)];
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const tl = sample(x - 1, y + 1), t = sample(x, y + 1), tr = sample(x + 1, y + 1);
      const l = sample(x - 1, y), r = sample(x + 1, y);
      const bl = sample(x - 1, y - 1), b = sample(x, y - 1), br = sample(x + 1, y - 1);
      const dx = ((tr + 2 * r + br) - (tl + 2 * l + bl)) * 0.125 / texel;
      const dy = ((tl + 2 * t + tr) - (bl + 2 * b + br)) * 0.125 / texel;
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const invLength = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLength; ny *= invLength; nz *= invLength;
      const p = (y * textureSize + x) * 4;
      normals[p] = Math.round((nx * 0.5 + 0.5) * 255);
      normals[p + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normals[p + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normals[p + 3] = 255;
    }
  }
  totalBakeMs += performance.now() - started;
  return {
    albedo: dataTexture(albedo, THREE.SRGBColorSpace, textureSize),
    normal: dataTexture(normals, THREE.NoColorSpace, textureSize),
    roughness: dataTexture(roughness, THREE.NoColorSpace, textureSize),
    ao: dataTexture(ao, THREE.NoColorSpace, textureSize)
  };
}

function texturesFor(surface: SurfaceType, textureSize: number) {
  const family = TEXTURE_FAMILY[surface];
  const key = `${family}:${textureSize}`;
  let textures = textureSets.get(key);
  if (!textures) {
    textures = bakeSurface(family, textureSize);
    textureSets.set(key, textures);
  }
  return textures;
}

export function getSurfaceMaterial(surface: SurfaceType, color: string, polygonOffset = false, textureSize = 256) {
  const key = `${surface}:${color.toLowerCase()}:${polygonOffset}:${textureSize}`;
  let material = materialCache.get(key);
  if (material) return material;
  const maps = texturesFor(surface, textureSize);
  const recipe = RECIPES[surface];
  material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), map: maps.albedo, normalMap: maps.normal,
    roughnessMap: maps.roughness, roughness: surface === "metal" ? 0.72 : surface === "glass" ? 0.38 : 1, aoMap: maps.ao, aoMapIntensity: 0.7,
    metalness: recipe.metalness, envMapIntensity: 0.78,
    polygonOffset, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  });
  materialCache.set(key, material);
  return material;
}

export function getBoxGeometry(size: { x: number; y: number; z: number }) {
  const rounded = [size.x, size.y, size.z].map((value) => Math.round(value * 1000) / 1000);
  const key = rounded.join(":");
  let geometry = geometryCache.get(key);
  if (geometry) return geometry;
  geometry = new THREE.BoxGeometry(rounded[0], rounded[1], rounded[2]);
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) {
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i));
    const uScale = nx > 0.5 ? rounded[2] / TILE_METRES : rounded[0] / TILE_METRES;
    const vScale = ny > 0.5 ? rounded[2] / TILE_METRES : rounded[1] / TILE_METRES;
    uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
  }
  uv.needsUpdate = true;
  geometry.setAttribute("uv1", uv.clone());
  geometryCache.set(key, geometry);
  return geometry;
}

export function classifySurface(collider: ArenaCollider, map: MapName): SurfaceType {
  const id = collider.id.toLowerCase();
  const color = collider.color.toLowerCase();
  if (id.includes("glass")) return "glass";
  if (id.includes("ladder") || id.includes("rail") || id.includes("train") || id.includes("metal")) return "metal";
  if (id.includes("tree") || id.includes("log") || id.includes("branch") || color === "#a77248") return "wood";
  if (map === "Forest" && (id.includes("hill") || id.includes("ground"))) return "grass";
  if (map === "Forest" && id.includes("rock")) return "stone";
  if (map === "Pyramid") return id.includes("pyramid") ? "stone" : "sand";
  if (map === "Bank Heist" && id.includes("surface")) return "tile";
  if (map === "Subway" && (id.includes("platform") || id.includes("street"))) return "tile";
  if (map === "Blueprint") return "plaster";
  if (map === "Practice Range") return id.includes("crate") ? "wood" : "concrete";
  return "concrete";
}

export function floorSurface(map: MapName): SurfaceType {
  if (map === "Forest") return "grass";
  if (map === "Pyramid") return "sand";
  if (map === "Bank Heist" || map === "Subway") return "tile";
  return "concrete";
}

export const materialBakeStats = () => ({
  milliseconds: totalBakeMs,
  surfaces: textureSets.size,
  resolutions: [...new Set([...textureSets.keys()].map((key) => Number(key.split(":")[1])))]
});
