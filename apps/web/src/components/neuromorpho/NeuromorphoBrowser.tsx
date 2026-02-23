"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  NeuromorphoNeuron,
  NeuromorphoPage,
} from "@/lib/neuromorpho-types";
import NeuronCard from "./NeuronCard";

interface NeuromorphoBrowserProps {
  onLoadNeuron: (name: string) => void;
  loadingNeuron: string | null;
}

export default function NeuromorphoBrowser({
  onLoadNeuron,
  loadingNeuron,
}: NeuromorphoBrowserProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ species: "", brain_region: "", cell_type: "" });
  const [results, setResults] = useState<NeuromorphoNeuron[]>([]);
  const [page, setPage] = useState<NeuromorphoPage | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    species: string[];
    brain_region: string[];
    cell_type: string[];
  }>({ species: [], brain_region: [], cell_type: [] });

  // Fetch filter options on mount
  useEffect(() => {
    const fields = ["species", "brain_region", "cell_type"] as const;
    fields.forEach(async (field) => {
      try {
        const res = await fetch(`/api/neuromorpho/fields/${field}`);
        if (!res.ok) return;
        const data = await res.json();
        const values: string[] = data.fields ?? [];
        setFilterOptions((prev) => ({ ...prev, [field]: values }));
      } catch {
        // silently ignore — filters just won't populate
      }
    });
  }, []);

  const doSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        // Build NeuroMorpho query string
        const parts: string[] = [];
        if (query.trim()) parts.push(query.trim());
        if (filters.species) parts.push(`species:${filters.species}`);
        if (filters.brain_region) parts.push(`brain_region:${filters.brain_region}`);
        if (filters.cell_type) parts.push(`cell_type:${filters.cell_type}`);

        const q = parts.join(" ");
        const params = new URLSearchParams({ page: String(pageNum), size: "20" });
        if (q) params.set("q", q);

        const res = await fetch(`/api/neuromorpho/search?${params}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Search failed (${res.status})`);
        }
        const data = await res.json();
        setResults(data._embedded?.neuronResources ?? []);
        setPage(data.page ?? null);
        setCurrentPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setPage(null);
      } finally {
        setLoading(false);
      }
    },
    [query, filters],
  );

  const handleSearch = () => doSearch(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Re-search when filters change
  useEffect(() => {
    // Only search if at least one filter is set or there's a query
    if (filters.species || filters.brain_region || filters.cell_type || query.trim()) {
      doSearch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider">NeuroMorpho.org</h3>

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search neurons..."
          className="border-border bg-bg flex-1 rounded border px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-accent hover:bg-accent-hover rounded px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-1.5">
        <FilterSelect
          label="Species"
          value={filters.species}
          options={filterOptions.species}
          onChange={(v) => handleFilterChange("species", v)}
        />
        <FilterSelect
          label="Region"
          value={filters.brain_region}
          options={filterOptions.brain_region}
          onChange={(v) => handleFilterChange("brain_region", v)}
        />
        <FilterSelect
          label="Cell type"
          value={filters.cell_type}
          options={filterOptions.cell_type}
          onChange={(v) => handleFilterChange("cell_type", v)}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Results */}
      {loading && results.length === 0 ? (
        <p className="text-text-muted py-4 text-center text-sm">Searching...</p>
      ) : results.length > 0 ? (
        <div className="flex flex-col gap-2">
          {results.map((neuron) => (
            <NeuronCard
              key={neuron.neuron_id}
              neuron={neuron}
              onLoad={onLoadNeuron}
              loading={loadingNeuron === neuron.neuron_name}
            />
          ))}
        </div>
      ) : page ? (
        <p className="text-text-muted py-4 text-center text-sm">No results found</p>
      ) : null}

      {/* Pagination */}
      {page && page.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">
            Page {page.number + 1} of {page.totalPages}
            {" \u00b7 "}
            {page.totalElements.toLocaleString()} results
          </span>
          <div className="flex gap-2">
            <button
              className="border-border bg-surface hover:bg-surface-hover rounded border px-2 py-1 transition-colors disabled:opacity-30"
              disabled={page.number === 0 || loading}
              onClick={() => doSearch(currentPage - 1)}
            >
              Prev
            </button>
            <button
              className="border-border bg-surface hover:bg-surface-hover rounded border px-2 py-1 transition-colors disabled:opacity-30"
              disabled={page.number >= page.totalPages - 1 || loading}
              onClick={() => doSearch(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-text-muted w-16 shrink-0 text-xs">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border bg-bg flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-accent"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
