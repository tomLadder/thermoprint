import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Sticker,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Grid,
  Layers,
} from "lucide-react";
import {
  searchIcons,
  fetchIconAsBlackDataUrl,
  fetchCollectionDetails,
  fetchAllCollectionsGrouped,
  loadIconsBatch,
  POPULAR_COLLECTIONS,
  type CollectionDetails,
  type AllCollectionItem,
} from "../../../lib/iconify.ts";
import { IconifyIcon } from "./iconify-icon.tsx";
import { useEditorV2Store } from "../../../store/editor-store.ts";

function uid() {
  return Math.random().toString(36).substring(2, 9);
}

interface Props {
  onClose: () => void;
  initialPrefix?: string | null;
  targetElementId?: string | null;
}

const PAGE_SIZE = 64;

export function IconsFlyout({
  onClose,
  initialPrefix = null,
  targetElementId = null,
}: Props) {
  const [query, setQuery] = useState("");
  const [activePrefix, setActivePrefix] = useState<string | null>(
    initialPrefix ?? null
  );

  // View state tracking
  const [mainScreenView, setMainScreenView] = useState<"popular" | "all">("popular");
  const [fromView, setFromView] = useState<"popular" | "all">("popular");

  // Filter states inside collection
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedVariant, setSelectedVariant] = useState<string>("all");

  const [loading, setLoading] = useState(false);
  const [insertingIcon, setInsertingIcon] = useState<string | null>(null);

  // All collections grouped state
  const [allGroupedCollections, setAllGroupedCollections] = useState<
    Record<string, AllCollectionItem[]>
  >({});
  const [collectionsMap, setCollectionsMap] = useState<
    Record<string, AllCollectionItem>
  >({});
  const [allCollectionsLoading, setAllCollectionsLoading] = useState(false);

  // Global search state
  const [searchResults, setSearchResults] = useState<{
    icons: string[];
    collections: Record<string, { name: string }>;
  }>({ icons: [], collections: {} });

  // Collection detail state
  const [collectionDetails, setCollectionDetails] =
    useState<CollectionDetails | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const addElement = useEditorV2Store((s) => s.addElement);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const elements = useEditorV2Store((s) => s.elements);
  const label = useEditorV2Store((s) => s.label);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch all collections metadata on mount so sample icons are dynamically available
  useEffect(() => {
    if (Object.keys(collectionsMap).length === 0) {
      setAllCollectionsLoading(true);
      fetchAllCollectionsGrouped().then((res) => {
        setAllGroupedCollections(res.grouped);
        setCollectionsMap(res.collectionsMap);
        setAllCollectionsLoading(false);
      });
    }
  }, [collectionsMap]);

  // Fetch collection details when activePrefix changes
  useEffect(() => {
    if (!activePrefix) {
      setCollectionDetails(null);
      setSelectedCategory("all");
      setSelectedVariant("all");
      return;
    }

    setLoading(true);
    fetchCollectionDetails(activePrefix).then((details) => {
      setCollectionDetails(details);
      setSelectedCategory("all");
      setSelectedVariant("all");
      setVisibleCount(PAGE_SIZE);
      setLoading(false);
    });
  }, [activePrefix]);

  // Global Search Debouncer (only when activePrefix is null and query is not empty)
  useEffect(() => {
    if (activePrefix || !query.trim()) {
      if (!activePrefix) setSearchResults({ icons: [], collections: {} });
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchIcons(query, undefined, 100).then((res) => {
        setSearchResults({ icons: res.icons, collections: res.collections });
        setLoading(false);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activePrefix]);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedCategory, selectedVariant]);

  const handleOpenCollection = (prefix: string) => {
    setFromView(mainScreenView);
    setActivePrefix(prefix);
  };

  const handleBackToCollections = () => {
    setActivePrefix(null);
    setSelectedCategory("all");
    setSelectedVariant("all");
  };

  // Compute collection icons with Category + Dynamic Variant + Query filtering
  const collectionIcons = useMemo(() => {
    if (!activePrefix || !collectionDetails) return [];

    let list: string[] = [];

    if (selectedCategory === "all") {
      const catList = Object.values(collectionDetails.categories).flat();
      list = Array.from(
        new Set([...catList, ...collectionDetails.uncategorized])
      );
    } else if (collectionDetails.categories[selectedCategory]) {
      list = collectionDetails.categories[selectedCategory];
    }

    let formattedList = list.map((item) =>
      item.includes(":") ? item : `${activePrefix}:${item}`
    );

    // Apply Dynamic Variant Filter
    if (selectedVariant !== "all") {
      const targetSuffix = selectedVariant.toLowerCase().replace(/\s+/g, "-");
      formattedList = formattedList.filter((icon) => {
        const lower = icon.toLowerCase();
        return (
          lower.endsWith(`-${targetSuffix}`) || lower.endsWith(`_${targetSuffix}`)
        );
      });
    }

    // Apply Query Filter
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return formattedList.filter((item) => item.toLowerCase().includes(q));
    }

    return formattedList;
  }, [activePrefix, collectionDetails, selectedCategory, selectedVariant, query]);

  const handleSelectIcon = async (iconName: string, prefix: string) => {
    if (insertingIcon) return;
    setInsertingIcon(iconName);

    try {
      const dataUrl = await fetchIconAsBlackDataUrl(iconName);
      const collName =
        collectionDetails?.title ||
        searchResults.collections[prefix]?.name ||
        prefix;

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const maxW = Math.min(200, label.widthPx * 0.8);
      const maxH = Math.min(200, label.heightPx * 0.8);
      let w = img.naturalWidth || 64;
      let h = img.naturalHeight || 64;

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      if (targetElementId) {
        const targetEl = elements.find((e) => e.id === targetElementId);
        if (targetEl) {
          updateElement(targetElementId, {
            width: w,
            height: h,
            props: {
              ...targetEl.props,
              src: dataUrl,
              iconName,
              collection: prefix,
              collectionName: collName,
            },
          });
        }
      } else {
        addElement({
          id: uid(),
          type: "image",
          x: Math.round((label.widthPx - w) / 2),
          y: Math.round((label.heightPx - h) / 2),
          width: w,
          height: h,
          rotation: 0,
          props: {
            src: dataUrl,
            iconName,
            collection: prefix,
            collectionName: collName,
            naturalWidth: img.naturalWidth || w,
            naturalHeight: img.naturalHeight || h,
          },
        });
      }

      onClose();
    } catch (err) {
      console.error("Failed to insert icon:", err);
    } finally {
      setInsertingIcon(null);
    }
  };

  const categoriesList = useMemo(() => {
    if (!collectionDetails?.categories) return [];
    return Object.keys(collectionDetails.categories);
  }, [collectionDetails]);

  const variantsList = useMemo(() => {
    return collectionDetails?.variants || [];
  }, [collectionDetails]);

  const isHomeView = !activePrefix && !query.trim();
  const isCollectionView = Boolean(activePrefix);

  const displayedIcons = isCollectionView
    ? collectionIcons.slice(0, visibleCount)
    : searchResults.icons;

  useEffect(() => {
    if (displayedIcons.length > 0) {
      loadIconsBatch(displayedIcons);
    }
  }, [displayedIcons]);

  useEffect(() => {
    const popularSamples = POPULAR_COLLECTIONS.map(
      (col) => collectionsMap[col.prefix]?.sampleIcon
    ).filter(Boolean) as string[];
    if (popularSamples.length > 0) {
      loadIconsBatch(popularSamples);
    }
  }, [collectionsMap]);

  return (
    <div className="fixed inset-x-2 bottom-20 max-h-[80vh] md:max-h-none md:inset-auto md:absolute md:bottom-44 md:left-1/2 md:-translate-x-1/2 md:w-[720px] md:h-[560px] bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-xl shadow-panel z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/5 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isCollectionView ? (
              <button
                onClick={handleBackToCollections}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink-800 border border-white/10 hover:border-white/25 text-ink-100 hover:text-white text-ui-xs font-semibold transition-colors shrink-0 outline-none"
                title={`Back to ${fromView === "all" ? "All Collections" : "Popular Collections"}`}
              >
                <ArrowLeft size={13} className="text-accent" />
                <span>
                  {fromView === "all" ? "All Collections" : "Collections"}
                </span>
              </button>
            ) : (
              <Sticker size={16} className="text-accent shrink-0" />
            )}

            {isCollectionView && (
              <span className="text-ink-500 font-mono text-ui-xs">/</span>
            )}

            <span
              className="text-ui-md font-semibold text-ink-50 truncate"
              title={
                targetElementId
                  ? "Replace Icon"
                  : isCollectionView
                  ? collectionDetails?.title || activePrefix || ""
                  : "Icon Search"
              }
            >
              {targetElementId
                ? "Replace Icon"
                : isCollectionView
                ? collectionDetails?.title || activePrefix
                : "Icon Search"}
            </span>

            {isCollectionView && collectionDetails && (
              <span className="text-ui-xs font-mono font-semibold text-accent ml-1 shrink-0">
                ({collectionDetails.total.toLocaleString()} icons)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-mono text-ink-200 font-medium tracking-wide">
              Powered by{" "}
              <a
                href="https://iconify.design"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-semibold cursor-pointer outline-none"
                title="Open Iconify website (https://iconify.design)"
              >
                Iconify
              </a>
            </span>
            <button
              onClick={onClose}
              className="text-ink-400 hover:text-ink-100 p-1 rounded-md hover:bg-ink-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Row 2: Search Bar + Category Dropdown (if present) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-ink-800 border border-white/5 flex-1 min-w-0">
            <Search size={13} className="text-ink-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isCollectionView
                  ? `Search inside ${collectionDetails?.title || "collection"}...`
                  : "Search icons (e.g. clock, box, warning, arrow)..."
              }
              className="bg-transparent text-ui-sm text-ink-100 placeholder-ink-500 outline-none flex-1 min-w-0"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-ink-500 hover:text-ink-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Dropdown (Only rendered if collection has categories) */}
          {isCollectionView && categoriesList.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2 rounded-md bg-ink-800 border border-white/5 text-ink-200 text-ui-xs font-medium outline-none shrink-0 cursor-pointer hover:border-white/15 max-w-[170px] truncate"
              title="Filter by Category"
            >
              <option value="all" title="All Categories">
                Categories ({categoriesList.length})
              </option>
              {categoriesList.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  title={`${cat} (${collectionDetails?.categories[cat]?.length || 0})`}
                >
                  {cat} ({collectionDetails?.categories[cat]?.length || 0})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Row 3: Collection-Specific Dynamic Variant Pills (Only rendered if collection has multiple variants) */}
        {isCollectionView && variantsList.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 scrollbar-none text-[11px] font-medium text-ink-400">
            <span className="mr-1 text-ink-500 uppercase tracking-wider text-[10px] shrink-0">
              Style:
            </span>
            <button
              onClick={() => setSelectedVariant("all")}
              className={`px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                selectedVariant === "all"
                  ? "bg-accent/15 text-accent border-accent/40 font-semibold"
                  : "bg-ink-800/80 text-ink-300 border-white/5 hover:border-white/15 hover:text-ink-100"
              }`}
              title="Show all styles"
            >
              All Styles
            </button>

            {variantsList.map((variant) => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                  selectedVariant === variant
                    ? "bg-accent/15 text-accent border-accent/40 font-semibold"
                    : "bg-ink-800/80 text-ink-300 border-white/5 hover:border-white/15 hover:text-ink-100"
                }`}
                title={`Filter by ${variant} style`}
              >
                {variant}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* MODE A1: Popular Collections Home View */}
        {isHomeView && mainScreenView === "popular" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-ui-sm font-semibold text-ink-200">
                <Sparkles size={14} className="text-accent" />
                <span>Popular Icon Collections</span>
              </div>
              <button
                onClick={() => setMainScreenView("all")}
                className="flex items-center gap-1 text-ui-xs font-semibold text-accent hover:underline outline-none"
              >
                <span>Browse All Collections</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {POPULAR_COLLECTIONS.map((col) => {
                const sampleIcon = collectionsMap[col.prefix]?.sampleIcon;
                return (
                  <button
                    key={col.prefix}
                    onClick={() => handleOpenCollection(col.prefix)}
                    className="group flex flex-col items-start p-3 rounded-lg bg-ink-800 border border-white/5 hover:border-accent/40 hover:bg-ink-750 transition-all duration-150 text-left outline-none"
                    title={`Open ${col.name} collection (${col.total})`}
                  >
                    <div className="w-full flex items-center justify-between mb-2">
                      {sampleIcon ? (
                        <IconifyIcon
                          name={sampleIcon}
                          className="w-6 h-6 object-contain text-ink-100 group-hover:scale-110 transition-transform duration-150"
                          title={col.name}
                        />
                      ) : (
                        <Loader2 size={16} className="animate-spin text-ink-400" />
                      )}
                      <ChevronRight
                        size={14}
                        className="text-ink-500 group-hover:text-accent transition-colors"
                      />
                    </div>
                    <div
                      className="text-ui-sm font-semibold text-ink-100 truncate w-full group-hover:text-accent"
                      title={col.name}
                    >
                      {col.name}
                    </div>
                    <div className="text-[11px] font-mono text-ink-400 mt-0.5">
                      {collectionsMap[col.prefix]?.total
                        ? `${collectionsMap[col.prefix].total.toLocaleString()} icons`
                        : col.total}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Banner Button to Browse All 200+ Collections */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setMainScreenView("all")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink-800 border border-white/10 hover:border-accent/40 text-ink-100 hover:text-white text-ui-sm font-semibold transition-all group"
              >
                <Grid size={15} className="text-accent" />
                <span>Browse All 200+ Collections by Category</span>
                <ChevronRight
                  size={14}
                  className="text-ink-400 group-hover:text-accent group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            </div>
          </div>
        )}

        {/* MODE A2: All Collections Grouped View */}
        {isHomeView && mainScreenView === "all" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2 text-ui-sm font-semibold text-ink-200">
                <Layers size={15} className="text-accent" />
                <span>All Iconify Collections by Category</span>
              </div>
              <button
                onClick={() => setMainScreenView("popular")}
                className="text-ui-xs font-semibold text-accent hover:underline outline-none"
              >
                ← Back to Popular
              </button>
            </div>

            {allCollectionsLoading && (
              <div className="h-48 flex items-center justify-center text-ink-400 gap-2">
                <Loader2 size={20} className="animate-spin text-accent" />
                <span className="text-ui-sm">Loading all 200+ collections...</span>
              </div>
            )}

            {!allCollectionsLoading &&
              Object.entries(allGroupedCollections).map(([catGroup, collections]) => (
                <div key={catGroup} className="space-y-2">
                  <div className="text-ui-xs font-semibold uppercase tracking-wider text-ink-400 pl-1 border-l-2 border-accent">
                    {catGroup} ({collections.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {collections.map((col) => (
                      <button
                        key={col.prefix}
                        onClick={() => handleOpenCollection(col.prefix)}
                        className="group flex items-center justify-between p-2.5 rounded-lg bg-ink-800 border border-white/5 hover:border-accent/40 hover:bg-ink-750 transition-all text-left outline-none"
                        title={`${col.name} (${col.total.toLocaleString()} icons)`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          {col.sampleIcon && (
                            <IconifyIcon
                              name={col.sampleIcon}
                              className="w-5 h-5 object-contain text-ink-200 shrink-0 group-hover:scale-110 transition-transform"
                              title={col.name}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-ui-xs font-semibold text-ink-100 truncate group-hover:text-accent">
                              {col.name}
                            </div>
                            <div className="text-[10px] font-mono text-ink-400 mt-0.5">
                              {col.total.toLocaleString()} icons
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          size={13}
                          className="text-ink-500 group-hover:text-accent shrink-0"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-ink-400 gap-2">
            <Loader2 size={24} className="animate-spin text-accent" />
            <span className="text-ui-sm">
              {isCollectionView ? "Loading collection..." : "Searching icons..."}
            </span>
          </div>
        )}

        {/* Empty Search / No Icons Found */}
        {!loading && !isHomeView && displayedIcons.length === 0 && (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-ink-800 border border-white/5 flex items-center justify-center mb-3">
              <Sticker size={18} className="text-ink-400" />
            </div>
            <div className="text-ui-md font-semibold text-ink-100">
              No icons found
            </div>
            <div className="text-ui-sm text-ink-400 mt-0.5">
              {isCollectionView
                ? "Try selecting a different style/category or clearing search"
                : "Try searching for 'box', 'warning', 'arrow', or 'recycle'"}
            </div>
          </div>
        )}

        {/* MODE B & C: Icon Grid */}
        {!loading && displayedIcons.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {displayedIcons.map((iconName) => {
                const prefix = iconName.split(":")[0];
                const namePart = iconName.split(":")[1] || iconName;
                const collName =
                  collectionDetails?.title ||
                  searchResults.collections[prefix]?.name ||
                  prefix;
                const isInserting = insertingIcon === iconName;

                return (
                  <div
                    key={iconName}
                    className="group relative flex flex-col items-center justify-center p-2.5 rounded-lg bg-ink-800 border border-white/5 hover:border-accent/40 hover:bg-ink-750 transition-all duration-150 text-left min-h-[72px]"
                    title={`${namePart} (${collName})`}
                  >
                    {/* Icon Click Button */}
                    <button
                      onClick={() => handleSelectIcon(iconName, prefix)}
                      disabled={isInserting}
                      className="w-full flex-1 flex flex-col items-center justify-center py-1 cursor-pointer outline-none"
                      title={`${namePart} — Click to insert`}
                    >
                      {isInserting ? (
                        <Loader2
                          size={20}
                          className="animate-spin text-accent"
                        />
                      ) : (
                        <IconifyIcon
                          name={iconName}
                          className="w-7 h-7 object-contain text-ink-100 group-hover:scale-110 transition-transform duration-150"
                          title={namePart}
                        />
                      )}
                    </button>

                    {/* Collection Badge Button: ONLY shown in Global Search mode */}
                    {!isCollectionView && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCollection(prefix);
                        }}
                        className="w-full mt-1.5 px-1 py-0.5 rounded text-[10px] leading-tight font-medium text-ink-400 hover:text-accent hover:bg-accent/10 truncate text-center border border-transparent hover:border-accent/20 transition-colors"
                        title={`Collection: ${collName}`}
                      >
                        {collName}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load More Button for Collection Browsing */}
            {isCollectionView && visibleCount < collectionIcons.length && (
              <div className="flex justify-center pt-2 pb-1">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-4 py-1.5 rounded-md bg-ink-800 border border-white/10 hover:border-white/20 text-ink-200 hover:text-ink-50 text-ui-xs font-semibold transition-colors"
                >
                  Load More ({collectionIcons.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
