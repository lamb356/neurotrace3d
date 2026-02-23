export interface NeuromorphoNeuron {
  neuron_id: number;
  neuron_name: string;
  archive: string;
  species: string;
  brain_region: string[];
  cell_type: string[];
  stain: string;
  strain: string;
  scientific_name: string;
  note: string;
  physical_Integrity: string;
  _links: {
    self: { href: string };
    measurements: { href: string };
  };
}

export interface NeuromorphoPage {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface NeuromorphoSearchResult {
  _embedded: { neuronResources: NeuromorphoNeuron[] };
  page: NeuromorphoPage;
}

export interface NeuromorphoFieldsResult {
  fields: string[];
  page: NeuromorphoPage;
}
