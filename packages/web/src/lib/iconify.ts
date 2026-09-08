export interface IconSearchResult {
  icons: string[];
  total: number;
  collections: Record<
    string,
    {
      name: string;
      author?: { name: string };
      palette?: boolean;
    }
  >;
}

export interface CollectionDetails {
  prefix: string;
  title: string;
  total: number;
  categories: Record<string, string[]>;
  variants: string[];
  uncategorized: string[];
}

export interface PopularCollectionInfo {
  prefix: string;
  name: string;
  total: string;
}

export interface AllCollectionItem {
  prefix: string;
  name: string;
  total: number;
  category: string;
  sampleIcon?: string;
  palette?: boolean;
}

export const POPULAR_COLLECTIONS: PopularCollectionInfo[] = [
  { prefix: "lucide", name: "Lucide Icons", total: "1,780+" },
  { prefix: "tabler", name: "Tabler Icons", total: "6,100+" },
  { prefix: "material-symbols", name: "Material Symbols", total: "15,600+" },
  { prefix: "ph", name: "Phosphor Icons", total: "9,000+" },
  { prefix: "mdi", name: "Material Design Icons", total: "7,400+" },
  { prefix: "ri", name: "Remix Icon", total: "3,200+" },
  { prefix: "boxicons", name: "Boxicons", total: "3,700+" },
  { prefix: "fa7-solid", name: "Font Awesome", total: "2,000+" },
  { prefix: "solar", name: "Solar Icons", total: "7,600+" },
  { prefix: "bi", name: "Bootstrap Icons", total: "2,000+" },
];

const EXCLUDED_PREFIXES = new Set([
  "line-md",
  "svg-spinners",
  "twemoji",
  "noto",
  "emojione",
  "emojione-v1",
  "emojione-monotone",
  "fxemoji",
  "openmoji",
  "flat-color-icons",
  "logos",
  "vscode-icons",
  "skill-icons",
  "circle-flags",
  "flag",
  "flagpack",
  "cib",
]);

export interface IconData {
  body: string;
  width: number;
  height: number;
  left: number;
  top: number;
}

const ICONIFY_HOSTS = [
  "https://api.iconify.design",
  "https://api.simplesvg.com",
  "https://api.unisvg.com",
];

class ConcurrencyQueue {
  private running = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(private maxConcurrent = 3) {}

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.next();
    });
  }

  private next() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const task = this.queue.shift()!;
    task().finally(() => {
      this.running--;
      this.next();
    });
  }
}

const apiQueue = new ConcurrencyQueue(3);

async function fetchJsonWithFallback(path: string): Promise<any> {
  let lastError: any = null;
  for (const host of ICONIFY_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`);
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 429) {
        // Rate limited on this host, try next host!
        continue;
      }
      lastError = new Error(`Host ${host} returned HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to fetch ${path} from all hosts`);
}

const iconDataCache = new Map<string, IconData>();
type IconListener = () => void;
const iconListeners = new Set<IconListener>();

export function subscribeToIcons(listener: IconListener) {
  iconListeners.add(listener);
  return () => {
    iconListeners.delete(listener);
  };
}

function notifyIconListeners() {
  for (const l of iconListeners) {
    try {
      l();
    } catch {
      // ignore listener errors
    }
  }
}

export function getIconData(iconName: string): IconData | undefined {
  return iconDataCache.get(iconName);
}

function resolveIcon(data: any, name: string): IconData | null {
  const defaultW = data.width || 24;
  const defaultH = data.height || 24;
  const defaultL = data.left || 0;
  const defaultT = data.top || 0;

  let current = name;
  const transforms: string[] = [];
  let depth = 0;
  let w = defaultW;
  let h = defaultH;
  let l = defaultL;
  let t = defaultT;

  while (depth < 5) {
    if (data.icons && data.icons[current]) {
      const raw = data.icons[current];
      w = raw.width ?? w;
      h = raw.height ?? h;
      l = raw.left ?? l;
      t = raw.top ?? t;
      let body = raw.body;
      if (transforms.length > 0) {
        body = `<g transform="${transforms.join(" ")}">${body}</g>`;
      }
      return { body, width: w, height: h, left: l, top: t };
    }

    if (data.aliases && data.aliases[current]) {
      const alias = data.aliases[current];
      const parentName = typeof alias === "string" ? alias : alias.parent;
      if (typeof alias !== "string") {
        if (alias.width) w = alias.width;
        if (alias.height) h = alias.height;
        if (alias.left) l = alias.left;
        if (alias.top) t = alias.top;
        if (alias.hFlip) transforms.push(`scale(-1, 1) translate(${-w}, 0)`);
        if (alias.vFlip) transforms.push(`scale(1, -1) translate(0, ${-h})`);
        if (alias.rotate)
          transforms.push(`rotate(${alias.rotate * 90} ${w / 2} ${h / 2})`);
      }
      current = parentName;
      depth++;
    } else {
      break;
    }
  }

  return null;
}

const inFlightBatches = new Map<string, Promise<void>>();

export async function loadIconsBatch(
  iconNames: string[]
): Promise<Record<string, IconData>> {
  if (!iconNames || iconNames.length === 0) return {};

  const byPrefix: Record<string, Set<string>> = {};
  for (const fullName of iconNames) {
    if (!fullName) continue;
    if (iconDataCache.has(fullName)) continue;

    const parts = fullName.split(":");
    if (parts.length === 2) {
      const [prefix, name] = parts;
      if (!byPrefix[prefix]) byPrefix[prefix] = new Set();
      byPrefix[prefix].add(name);
    }
  }

  const promises: Promise<void>[] = [];

  for (const [prefix, nameSet] of Object.entries(byPrefix)) {
    const names = Array.from(nameSet);
    for (let i = 0; i < names.length; i += 40) {
      const chunk = names.slice(i, i + 40);
      const batchKey = `${prefix}:${chunk.sort().join(",")}`;

      let inflight = inFlightBatches.get(batchKey);
      if (!inflight) {
        inflight = apiQueue.add(async () => {
          try {
            const data = await fetchJsonWithFallback(
              `/${prefix}.json?icons=${encodeURIComponent(chunk.join(","))}`
            );
            if (data) {
              for (const name of chunk) {
                const icon = resolveIcon(data, name);
                if (icon) {
                  iconDataCache.set(`${prefix}:${name}`, icon);
                }
              }
              notifyIconListeners();
            }
          } catch (err) {
            console.warn(`Failed to fetch icons batch for prefix "${prefix}":`, err);
          } finally {
            inFlightBatches.delete(batchKey);
          }
        });
        inFlightBatches.set(batchKey, inflight);
      }
      promises.push(inflight);
    }
  }

  await Promise.all(promises);

  const result: Record<string, IconData> = {};
  for (const fullName of iconNames) {
    const cached = iconDataCache.get(fullName);
    if (cached) result[fullName] = cached;
  }
  return result;
}

let pendingAutoLoad = new Set<string>();
let autoLoadTimer: any = null;

export function queueIconLoad(fullName: string) {
  if (!fullName || iconDataCache.has(fullName)) return;
  pendingAutoLoad.add(fullName);

  if (!autoLoadTimer) {
    autoLoadTimer = setTimeout(() => {
      autoLoadTimer = null;
      const toLoad = Array.from(pendingAutoLoad);
      pendingAutoLoad.clear();
      loadIconsBatch(toLoad);
    }, 20);
  }
}

export async function searchIcons(
  query: string,
  prefix?: string,
  limit = 64
): Promise<IconSearchResult> {
  const searchTerm = query.trim();
  if (!searchTerm && !prefix) {
    return { icons: [], total: 0, collections: {} };
  }

  let path = `/search?query=${encodeURIComponent(
    searchTerm || "a"
  )}&limit=${limit}`;

  if (prefix) {
    path += `&prefix=${encodeURIComponent(prefix)}`;
  }

  try {
    const data = await fetchJsonWithFallback(path);

    const icons: string[] = data.icons || [];
    const collections: Record<string, { name: string; palette?: boolean }> =
      data.collections || {};

    const filteredIcons = icons.filter((icon) => {
      const p = icon.split(":")[0];
      if (EXCLUDED_PREFIXES.has(p)) return false;
      if (collections[p] && collections[p].palette === true) return false;
      return true;
    });

    return {
      icons: filteredIcons,
      total: data.total || filteredIcons.length,
      collections,
    };
  } catch (err) {
    console.error("Iconify search error:", err);
    return { icons: [], total: 0, collections: {} };
  }
}

export async function fetchAllCollectionsGrouped(): Promise<{
  grouped: Record<string, AllCollectionItem[]>;
  collectionsMap: Record<string, AllCollectionItem>;
}> {
  try {
    const data = await fetchJsonWithFallback("/collections");
    if (!data) return { grouped: {}, collectionsMap: {} };

    const grouped: Record<string, AllCollectionItem[]> = {};
    const collectionsMap: Record<string, AllCollectionItem> = {};

    for (const [prefix, info] of Object.entries(data as Record<string, any>)) {
      if (EXCLUDED_PREFIXES.has(prefix) || info.palette === true) continue;

      const catName = info.category || "General";
      if (!grouped[catName]) grouped[catName] = [];

      const sample = info.samples?.[0]
        ? `${prefix}:${info.samples[0]}`
        : undefined;

      const item: AllCollectionItem = {
        prefix,
        name: info.name || prefix,
        total: info.total || 0,
        category: catName,
        sampleIcon: sample,
        palette: info.palette,
      };

      grouped[catName].push(item);
      collectionsMap[prefix] = item;
    }

    return { grouped, collectionsMap };
  } catch (err) {
    console.error("Error fetching all collections:", err);
    return { grouped: {}, collectionsMap: {} };
  }
}

function detectCollectionVariants(iconList: string[]): string[] {
  const suffixCounts: Record<string, number> = {};

  const knownSuffixes = [
    "outline-rounded",
    "outline-sharp",
    "outline",
    "rounded",
    "sharp",
    "filled",
    "fill",
    "duotone",
    "twotone",
    "bold",
    "light",
    "thin",
    "line",
    "solid",
    "regular",
  ];

  for (const icon of iconList) {
    const lower = icon.toLowerCase();
    for (const suf of knownSuffixes) {
      if (lower.endsWith(`-${suf}`) || lower.endsWith(`_${suf}`)) {
        const title = suf
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        suffixCounts[title] = (suffixCounts[title] || 0) + 1;
        break;
      }
    }
  }

  return Object.keys(suffixCounts).filter((k) => suffixCounts[k] >= 5);
}

export async function fetchCollectionDetails(
  prefix: string
): Promise<CollectionDetails | null> {
  try {
    const data = await fetchJsonWithFallback(
      `/collection?prefix=${encodeURIComponent(prefix)}`
    );
    if (!data) return null;

    const categories: Record<string, string[]> = data.categories || {};
    const uncategorized: string[] = data.uncategorized || [];

    const allIconsInCollection = [
      ...Object.values(categories).flat(),
      ...uncategorized,
    ];

    const variants = detectCollectionVariants(allIconsInCollection);

    return {
      prefix: data.prefix,
      title: data.title || prefix,
      total: data.total || allIconsInCollection.length,
      categories,
      variants,
      uncategorized,
    };
  } catch (err) {
    console.error("Error fetching collection details:", err);
    return null;
  }
}

export async function fetchIconWithColorDataUrl(
  iconName: string,
  colorHex = "#000000"
): Promise<string> {
  let icon = getIconData(iconName);
  if (!icon) {
    await loadIconsBatch([iconName]);
    icon = getIconData(iconName);
  }

  const targetColor = colorHex || "#000000";

  if (icon) {
    let body = icon.body;
    if (
      !body.includes("currentColor") &&
      !body.includes('fill="') &&
      !body.includes('stroke="')
    ) {
      body = `<g fill="${targetColor}">${body}</g>`;
    } else {
      body = body
        .replace(/currentColor/gi, targetColor)
        .replace(/fill="(?!none)[^"]*"/gi, `fill="${targetColor}"`);
    }

    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left} ${icon.top} ${icon.width} ${icon.height}" width="512" height="512">${body}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  // Fallback to direct SVG endpoint if JSON failed
  const cleanName = iconName.includes(":")
    ? iconName.replace(":", "/")
    : iconName;

  for (const host of ICONIFY_HOSTS) {
    try {
      const url = `${host}/${cleanName}.svg?color=${encodeURIComponent(targetColor)}`;
      const res = await fetch(url);
      if (res.ok) {
        let svgText = await res.text();
        if (!svgText.includes("width=")) {
          svgText = svgText.replace("<svg", '<svg width="512" height="512"');
        } else {
          svgText = svgText
            .replace(/width="[^"]*"/i, 'width="512"')
            .replace(/height="[^"]*"/i, 'height="512"');
        }
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      }
    } catch {
      // try next host
    }
  }

  throw new Error(`Failed to fetch SVG for ${iconName}`);
}

export async function fetchIconAsBlackDataUrl(iconName: string): Promise<string> {
  return fetchIconWithColorDataUrl(iconName, "#000000");
}

