import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  useListProviders,
  useUpdateProvider,
  useCreateProvider,
  useSchema,
  type ProviderGroupOut,
  type ProviderGroupCreate,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { selector } from "@/lib/selector";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import {
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRightIcon,
  Check,
  Loader2,
  Pencil,
  Download,
  RotateCcw,
  Plus,
} from "lucide-react";

// Single-page app; no router needed. main.tsx renders <GridPage /> directly
// inside the TooltipProvider/ThemeProvider wrappers.
export { GridPage };

// ============================================================================
// Column metadata — ALL HANDLED IN ONE FILE:
//   shared/columns.ts
//
// To add/remove/rename a column, edit that file. The grid auto-updates from:
//   COLUMNS            — per-column metadata (label, type, options, etc.)
//   COLUMN_GROUPS      — the colored group pills in the toolbar
//   COLUMN_DEFINITIONS — tooltip text (derived from COLUMNS)
//   EMPTY_FORM         — blank values for the inline-add row
//   CSV_HEADERS        — CSV export column order
//   DROPDOWN_OPTIONS   — for the inline-add form
// ============================================================================

import {
  COLUMNS,
  COLUMN_GROUPS,
  COLUMN_DEFINITIONS,
  EMPTY_FORM as emptyForm,
  CSV_HEADERS,
  DROPDOWN_OPTIONS,
  IDENTITY_KEYS,
} from "@shared/columns";

// ============================================================================
// Reusable cell components
// ============================================================================

function TruncatedText({ value, className = "" }: { value: string; className?: string }) {
  if (!value) return <span className={`block text-sm ${className}`}>—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`block truncate text-sm cursor-default ${className}`}>{value}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-md text-sm whitespace-pre-wrap break-words">{value}</TooltipContent>
    </Tooltip>
  );
}

function EditableCell({
  value: initialValue, onSave, isSaving, type = "text", options,
}: {
  value: string; onSave: (val: string) => void; isSaving?: boolean;
  type?: "text" | "number" | "select" | "date"; options?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setValue(initialValue); setEditing(false); }, [initialValue]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  const save = () => { if (value !== initialValue) onSave(value); setEditing(false); };
  const cancel = () => { setValue(initialValue); setEditing(false); };

  if (type === "select" && options) {
    return (
      <div className="relative">
        {isSaving && <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded z-10"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>}
        <Select value={value} onValueChange={(v) => { setValue(v); if (v !== initialValue) onSave(v); }} disabled={isSaving}>
          <SelectTrigger className="h-8 border-0 bg-transparent shadow-none hover:bg-muted/50 px-1 -mx-1 text-sm">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }

  if (!editing) {
    const display = (
      <div className="relative group">
        {isSaving && <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded z-10"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>}
        <span className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1 flex items-center gap-1 text-sm min-h-[1.5rem]" onClick={() => !isSaving && setEditing(true)}>
          <span className="truncate flex-1">{value || "—"}</span>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        </span>
      </div>
    );
    if (value && value.length > 25) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{display}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md text-sm whitespace-pre-wrap break-words">{value}</TooltipContent>
        </Tooltip>
      );
    }
    return display;
  }

  return (
    <div className="flex items-center gap-1 -mx-1">
      <Input ref={inputRef} type={type === "date" ? "date" : type} value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        className="h-8 px-1 flex-1 min-w-0 text-sm" />
      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={save} disabled={value === initialValue}>
        <Check className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={cancel}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function CommentsCell({ value, isSaving, onOpen }: { value: string; isSaving?: boolean; onOpen: () => void }) {
  return (
    <div className="relative group">
      {isSaving && <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded z-10"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>}
      <button type="button" className="w-full text-left cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1 flex items-center gap-1 text-sm min-h-[1.5rem]" onClick={() => !isSaving && onOpen()}>
        <span className="truncate flex-1">{value || "—"}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
      </button>
    </div>
  );
}

function LockedCell({ value }: { value: string }) {
  return <TruncatedText value={value} className="text-muted-foreground" />;
}

// ============================================================================
// Inline Add Row
// ============================================================================

function useMarketHeadMap(data: ProviderGroupOut[]) {
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of data) {
      if (r.territory && r.market_head && !map[r.territory]) map[r.territory] = r.market_head;
    }
    return map;
  }, [data]);
}

function InlineAddRow({
  onCreated, visibleColumns, marketHeadMap, dropdownOptions,
}: {
  onCreated: () => void;
  visibleColumns: string[];
  marketHeadMap: Record<string, string>;
  /** Dynamic dropdown options: static list + values observed in data. */
  dropdownOptions: Record<string, string[]>;
}) {
  const createMutation = useCreateProvider();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const reset = () => setForm({ ...emptyForm });
  const set = (field: string, val: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "territory" && marketHeadMap[val]) next.market_head = marketHeadMap[val];
      return next;
    });
  };

  // All identity columns must be non-blank to submit a new row.
  const canSubmit = IDENTITY_KEYS.every((k) => (form[k] ?? "").trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    const data: Record<string, any> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v.trim()) data[k] = v.trim();
    }
    createMutation.mutate(
      { params: {}, data: data as ProviderGroupCreate },
      {
        onSuccess: () => { toast.success("Provider group created"); reset(); setOpen(false); onCreated(); },
        onError: (err) => toast.error(`Failed to create: ${err.message}`),
      },
    );
  };

  // Build a quick lookup of column type per key (from shared/columns.ts).
  const colByKey = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

  function renderAddCell(colId: string) {
    if (colId === "row_number") return <span className="text-muted-foreground text-sm">—</span>;

    const col = colByKey[colId];
    const placeholder = col ? `${col.label}${col.locked ? " *" : ""}` : "—";

    // Select: use dynamic options (static list + values already in the data)
    const opts = dropdownOptions[colId] ?? DROPDOWN_OPTIONS[colId];
    if (opts) {
      return (
        <Select value={form[colId] || ""} onValueChange={(v) => set(colId, v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    if (col?.type === "date") {
      return <Input className="h-8 text-sm" type="date" value={form[colId] || ""} onChange={(e) => set(colId, e.target.value)} />;
    }

    // text or comments fallback
    return <Input className="h-8 text-sm" placeholder={placeholder} value={form[colId] || ""} onChange={(e) => set(colId, e.target.value)} />;
  }

  if (!open) {
    return (
      <tr className="bg-muted/30 hover:bg-muted/50">
        <td colSpan={visibleColumns.length + 1}>
          <Button variant="ghost" size="sm" className="h-8 text-sm text-muted-foreground ml-2" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Provider Group
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50/50 dark:bg-blue-950/20 border-b-2 border-blue-200 dark:border-blue-800">
      {visibleColumns.map((colId) => (
        <td key={colId} className="p-1">{renderAddCell(colId)}</td>
      ))}
      <td className="p-1">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => { reset(); setOpen(false); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Global text filter
// ============================================================================

function globalFilterFn(row: any, _columnId: string, filterValue: string) {
  if (!filterValue) return true;
  const search = filterValue.toLowerCase();
  const r = row.original as ProviderGroupOut;
  const fields = [
    r.territory, r.market_head, r.state, r.pbg_number, r.pbg_name,
    r.currently_managed_by, r.previously_managed_by, r.comments,
    r.emr, r.poc_solution,
  ];
  return fields.some((f) => (f || "").toLowerCase().includes(search));
}

// ============================================================================
// Cascaded filter helpers
// ============================================================================

type FilterKey = "territory" | "market_head" | "state" | "managed_by";

function applyFilters(
  rows: ProviderGroupOut[], skip: FilterKey | "",
  t: string, m: string, s: string, mb: string,
): ProviderGroupOut[] {
  return rows.filter((r) =>
    (skip === "territory"   || !t  || r.territory === t) &&
    (skip === "market_head" || !m  || r.market_head === m) &&
    (skip === "state"       || !s  || r.state === s) &&
    (skip === "managed_by"  || !mb || r.currently_managed_by === mb)
  );
}

function distinctSorted(rows: ProviderGroupOut[], key: keyof ProviderGroupOut): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "string" && v) set.add(v);
  }
  return [...set].sort();
}

// ============================================================================
// Main Grid
// ============================================================================

function GridPage() {
  const qc = useQueryClient();
  const { data: result, isLoading } = useListProviders({ ...selector() });
  const { data: schema } = useSchema({ ...selector() });
  const updateMutation = useUpdateProvider();

  const allData = result?.items ?? [];
  const marketHeadMap = useMarketHeadMap(allData);

  // ---- Column tooltips: UC comments override the static definitions. ----
  // `schema.column_comments` comes from the server's `DESCRIBE TABLE` query.
  // When the data team runs `ALTER TABLE ... ALTER COLUMN x COMMENT 'New...'`,
  // the new tooltip shows up after at most 5 minutes (server cache TTL).
  const tooltipFor = (key: string): string =>
    (schema?.column_comments?.[key] || COLUMN_DEFINITIONS[key] || "").trim();

  // ---- Dropdown options: union of static list + values actually present in
  // the data. If a new territory value gets loaded via SQL that's not in the
  // static list, it automatically becomes a pickable option in the editor. ----
  const dynamicDropdownOptions = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [key, staticOpts] of Object.entries(DROPDOWN_OPTIONS)) {
      const fromData = new Set<string>();
      for (const row of allData) {
        const v = (row as Record<string, unknown>)[key];
        if (typeof v === "string" && v) fromData.add(v);
      }
      // Union: static list preserves canonical ordering, then any novel
      // values from data appended.
      const seen = new Set(staticOpts);
      const extras = [...fromData].filter((v) => !seen.has(v)).sort();
      result[key] = [...staticOpts, ...extras];
    }
    return result;
  }, [allData]);

  // --- Collapsible column groups + column search ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupId: string) => setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  const [columnSearch, setColumnSearch] = useState("");

  // --- Client-side filter state ---
  const [globalSearch, setGlobalSearch] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [marketHeadFilter, setMarketHeadFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [currentlyManagedFilter, setCurrentlyManagedFilter] = useState("");

  // Cascaded filter options — each filter's options narrow based on the *other* active filters.
  const territoryOptions = useMemo(() =>
    distinctSorted(applyFilters(allData, "territory", territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter), "territory"),
    [allData, marketHeadFilter, stateFilter, currentlyManagedFilter, territoryFilter]);
  const marketHeadOptions = useMemo(() =>
    distinctSorted(applyFilters(allData, "market_head", territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter), "market_head"),
    [allData, territoryFilter, stateFilter, currentlyManagedFilter, marketHeadFilter]);
  const stateOptions = useMemo(() =>
    distinctSorted(applyFilters(allData, "state", territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter), "state"),
    [allData, territoryFilter, marketHeadFilter, currentlyManagedFilter, stateFilter]);
  const currentlyManagedOptions = useMemo(() =>
    distinctSorted(applyFilters(allData, "managed_by", territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter), "currently_managed_by"),
    [allData, territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter]);

  // Auto-reset a filter if its current value is no longer valid given the other filters.
  useEffect(() => { if (territoryFilter && !territoryOptions.includes(territoryFilter)) setTerritoryFilter(""); }, [territoryOptions, territoryFilter]);
  useEffect(() => { if (marketHeadFilter && !marketHeadOptions.includes(marketHeadFilter)) setMarketHeadFilter(""); }, [marketHeadOptions, marketHeadFilter]);
  useEffect(() => { if (stateFilter && !stateOptions.includes(stateFilter)) setStateFilter(""); }, [stateOptions, stateFilter]);
  useEffect(() => { if (currentlyManagedFilter && !currentlyManagedOptions.includes(currentlyManagedFilter)) setCurrentlyManagedFilter(""); }, [currentlyManagedOptions, currentlyManagedFilter]);

  const filteredData = useMemo(() =>
    applyFilters(allData, "", territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter),
    [allData, territoryFilter, marketHeadFilter, stateFilter, currentlyManagedFilter]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});
  const [commentsEdit, setCommentsEdit] = useState<{ id: string; value: string } | null>(null);
  const [commentsDraft, setCommentsDraft] = useState("");

  const handleCellSave = useCallback(
    (id: string, field: string, value: string) => {
      const cellKey = `${id}:${field}`;
      const body: Record<string, string> = { [field]: value };
      setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
      updateMutation.mutate(
        { params: { provider_id: id }, data: body },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/providers"] });
            toast.success(`Updated ${field.replace(/_/g, " ")}`, { duration: 2000 });
          },
          onError: (err) => toast.error(`Update failed: ${err.message}`),
          onSettled: () => setSavingCells((prev) => { const next = { ...prev }; delete next[cellKey]; return next; }),
        },
      );
    },
    [updateMutation, qc],
  );

  type ColMeta = { group?: string };

  const allColumns: (ColumnDef<ProviderGroupOut> & { meta?: ColMeta })[] = useMemo(() => {
    const sc = savingCells;
    const hcs = handleCellSave;

    // Per-type cell builders. `sel` = dropdown, `dt` = date, `txt` = free-text
    // editable (unused for now — identity cols are locked, everything else is
    // either a select, date, or comments).
    const sel = (key: string, header: string, options: string[], w: number, group: string | null, minW?: number) => ({
      accessorKey: key, header, size: w, minSize: minW ?? Math.max(w - 20, 44),
      meta: { group } as ColMeta,
      cell: ({ row }: any) => <EditableCell value={(row.original as any)[key] || ""} type="select" options={options} isSaving={sc[`${row.original.id}:${key}`]} onSave={(v: string) => hcs(row.original.id, key, v)} />,
    });
    const dt = (key: string, header: string, w: number, group: string | null, minW?: number) => ({
      accessorKey: key, header, size: w, minSize: minW ?? Math.max(w - 20, 44),
      meta: { group } as ColMeta,
      cell: ({ row }: any) => <EditableCell value={(row.original as any)[key] || ""} type="date" isSaving={sc[`${row.original.id}:${key}`]} onSave={(v: string) => hcs(row.original.id, key, v)} />,
    });

    // Row-number column — always first, always visible. Not data.
    const rowNumberCol = {
      id: "row_number", header: "#", size: 56, minSize: 44, enableSorting: false,
      cell: ({ row, table }: any) => {
        const sortedRows = table.getSortedRowModel().rows;
        const displayIndex = sortedRows.findIndex((r: any) => r.id === row.id);
        return (
          <span className="block text-sm text-muted-foreground tabular-nums text-right pr-1">
            {displayIndex + 1}
          </span>
        );
      },
    };

    // Data columns — built from shared/columns.ts. To add/remove a column,
    // edit that file. The grid auto-updates.
    const dataCols = COLUMNS.map((col) => {
      if (col.locked) {
        return {
          accessorKey: col.key, header: col.label, size: col.width, minSize: col.minWidth,
          meta: { group: col.group } as ColMeta,
          cell: ({ row }: any) => <LockedCell value={(row.original as any)[col.key] ?? ""} />,
        };
      }
      if (col.type === "select" && col.options) {
        // Use dynamic options (static list + distinct values from data) so
        // newly-ingested values become pickable without a code change.
        const opts = dynamicDropdownOptions[col.key] ?? col.options;
        return sel(col.key, col.label, opts, col.width, col.group, col.minWidth);
      }
      if (col.type === "date") {
        return dt(col.key, col.label, col.width, col.group, col.minWidth);
      }
      if (col.type === "comments") {
        return {
          accessorKey: col.key, header: col.label, size: col.width, minSize: col.minWidth,
          meta: { group: col.group } as ColMeta,
          cell: ({ row }: any) => (
            <CommentsCell
              value={(row.original as any)[col.key] || ""}
              isSaving={sc[`${row.original.id}:${col.key}`]}
              onOpen={() => {
                const v = (row.original as any)[col.key] || "";
                setCommentsEdit({ id: row.original.id, value: v });
                setCommentsDraft(v);
              }}
            />
          ),
        };
      }
      // Fallback: plain editable text (currently unused, but supports new
      // text-type columns added to shared/columns.ts).
      return {
        accessorKey: col.key, header: col.label, size: col.width, minSize: col.minWidth,
        meta: { group: col.group } as ColMeta,
        cell: ({ row }: any) => <EditableCell value={(row.original as any)[col.key] || ""} type="text" isSaving={sc[`${row.original.id}:${col.key}`]} onSave={(v: string) => hcs(row.original.id, col.key, v)} />,
      };
    });

    return [rowNumberCol, ...dataCols];
  }, [savingCells, handleCellSave, dynamicDropdownOptions]);

  const visibleColumns = useMemo(() => {
    const search = columnSearch.toLowerCase().trim();
    return allColumns.filter((col) => {
      const colId = (col as any).accessorKey || (col as any).id;
      const group = (col.meta as ColMeta)?.group;
      if (search) {
        const header = typeof col.header === "string" ? col.header.toLowerCase() : "";
        const def = (COLUMN_DEFINITIONS[colId] || "").toLowerCase();
        return header.includes(search) || def.includes(search) || colId.toLowerCase().includes(search);
      }
      if (!group) return true;
      return expandedGroups[group];
    });
  }, [allColumns, expandedGroups, columnSearch]);

  const visibleColumnIds = useMemo(() =>
    visibleColumns.map((c) => (c as any).accessorKey || (c as any).id).filter(Boolean) as string[],
  [visibleColumns]);

  const table = useReactTable({
    data: filteredData,
    columns: visibleColumns,
    state: { sorting, globalFilter: globalSearch },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalSearch,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const clearFilters = () => {
    setGlobalSearch(""); setTerritoryFilter(""); setMarketHeadFilter("");
    setStateFilter(""); setCurrentlyManagedFilter("");
  };
  const hasFilters = globalSearch || territoryFilter || marketHeadFilter || stateFilter || currentlyManagedFilter;

  // --- CSV Export ---
  const [exporting, setExporting] = useState(false);
  const handleExportCsv = useCallback(() => {
    setExporting(true);
    try {
      const rows = filteredData;
      if (rows.length === 0) { toast.info("No data to export"); return; }
      // Column keys + CSV headers come from shared/columns.ts — edit there
      // to add / remove / reorder columns in the export.
      const keys = COLUMNS.map((c) => c.key);
      const csvRows = rows.map((r) => {
        const vals = keys.map((k) => esc((r as any)[k]));
        vals.push(esc(r.created_by), esc(r.created_at), esc(r.updated_at));
        return vals.join(",");
      });
      const csv = [CSV_HEADERS.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `provider-groups-medicaid-subset-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} rows`);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally { setExporting(false); }
  }, [filteredData]);

  return (
    <div className="h-screen flex flex-col overflow-hidden p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Groups — Medicaid Subset</h1>
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {allData.length} rows
            {hasFilters ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting || isLoading}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Unified Toolbar — frozen at the top of the grid area, outside the scroll container */}
      <div className="rounded-lg border bg-muted/60 backdrop-blur-sm p-3 shrink-0 space-y-2.5 shadow-sm">
        {/* Row 1: Columns — group toggles + column search */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Columns</span>
          {COLUMN_GROUPS.map((g) => {
            const isExpanded = expandedGroups[g.id];
            return (
              <button
                key={g.id}
                onClick={() => { setColumnSearch(""); toggleGroup(g.id); }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium transition-all border ${
                  isExpanded
                    ? `${g.color} border-transparent`
                    : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                }`}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                {g.label}
              </button>
            );
          })}
          <button
            onClick={() => {
              setColumnSearch("");
              const allExpanded = COLUMN_GROUPS.every((g) => expandedGroups[g.id]);
              const next: Record<string, boolean> = {};
              COLUMN_GROUPS.forEach((g) => { next[g.id] = !allExpanded; });
              setExpandedGroups(next);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium bg-background text-muted-foreground border border-border hover:bg-muted/60"
          >
            {COLUMN_GROUPS.every((g) => expandedGroups[g.id]) ? "Collapse All" : "Expand All"}
          </button>
          <div className="ml-auto relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Find column..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="h-8 pl-7 text-sm w-40 bg-background"
            />
            {columnSearch && (
              <button onClick={() => setColumnSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Row 2: Rows — filter dropdowns + row search */}
        <div className="flex flex-wrap gap-2 items-end">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-0.5 self-center">Rows</span>
          <FilterField label="Territory">
            <FilterDropdown value={territoryFilter} options={territoryOptions} onChange={setTerritoryFilter} />
          </FilterField>
          <FilterField label="Market Head">
            <FilterDropdown value={marketHeadFilter} options={marketHeadOptions} onChange={setMarketHeadFilter} />
          </FilterField>
          <FilterField label="State">
            <FilterDropdown value={stateFilter} options={stateOptions} onChange={setStateFilter} />
          </FilterField>
          <FilterField label="Managed By">
            <FilterDropdown value={currentlyManagedFilter} options={currentlyManagedOptions} onChange={setCurrentlyManagedFilter} />
          </FilterField>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search rows..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="h-9 pl-8 text-sm w-48 bg-background" />
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters} className="h-9 bg-background" title="Reset all filters">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Pagination — above the grid so it's always visible regardless of scroll */}
      {!isLoading && table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="flex-1 overflow-scroll rounded-md border grid-scroll">
          <table className="w-max min-w-full text-sm">
            <thead className="sticky top-0 bg-background z-10 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const colDef = header.column.columnDef as any;
                    const colId = colDef.accessorKey || colDef.id || "";
                    const groupId = colDef.meta?.group;
                    const group = groupId ? COLUMN_GROUPS.find((g) => g.id === groupId) : null;
                    // UC column comments take precedence; fall back to static
                    // definitions from shared/columns.ts.
                    const definition = tooltipFor(colId);
                    const headerContent = (
                      <div className="flex items-center gap-1">
                        {group && <span className={`inline-block w-1.5 h-1.5 rounded-full ${group.color.split(" ")[0]}`} />}
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
                          header.column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    );
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize(), minWidth: colDef.minSize }}
                        className={`text-left text-sm font-medium py-2 px-3 whitespace-nowrap ${
                          group ? `text-foreground border-t-2 ${group.borderColor} ${group.bgTint}` : "text-muted-foreground"
                        } ${header.column.getCanSort() ? "cursor-pointer select-none hover:bg-muted/50" : ""}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {definition ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{headerContent}</TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-normal">
                              {group && <span className={`inline-block text-xs font-semibold mb-1 px-1.5 py-0.5 rounded ${group.color}`}>{group.label}</span>}
                              <p>{definition}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : headerContent}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              <InlineAddRow
                onCreated={() => qc.invalidateQueries({ queryKey: ["/api/providers"] })}
                visibleColumns={visibleColumnIds}
                marketHeadMap={marketHeadMap}
                dropdownOptions={dynamicDropdownOptions}
              />
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="h-24 text-center text-muted-foreground text-sm">
                    No provider groups found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr key={row.id} className={`border-b hover:bg-muted/40 transition-colors ${idx % 2 === 1 ? "bg-muted/15" : ""}`}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ width: cell.column.getSize(), minWidth: (cell.column.columnDef as any).minSize, maxWidth: cell.column.getSize() }} className="py-1.5 px-3 overflow-hidden">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Comments Edit Dialog */}
      <Dialog open={!!commentsEdit} onOpenChange={(open) => { if (!open) setCommentsEdit(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Comments</DialogTitle>
            <DialogDescription>Update comments for this provider group.</DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full min-h-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            value={commentsDraft} onChange={(e) => setCommentsDraft(e.target.value)} placeholder="Enter comments..." autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentsEdit(null)}>Cancel</Button>
            <Button onClick={() => {
              if (commentsEdit && commentsDraft !== commentsEdit.value) handleCellSave(commentsEdit.id, "comments", commentsDraft);
              setCommentsEdit(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function esc(val: string | number | null | undefined) {
  return `"${String(val ?? "").replace(/"/g, '""')}"`;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function FilterDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger className="h-9 text-sm w-[150px]">
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-md border flex-1 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {Array.from({ length: 8 }).map((_, i) => <th key={i} className="p-2"><Skeleton className="h-4 w-16" /></th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 15 }).map((_, i) => (
            <tr key={i} className="border-b">
              {Array.from({ length: 8 }).map((_, j) => <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
