export type LocationType = 'headquarters' | 'office' | 'factory';

export interface CompanyLocationData {
  id: string;
  type: LocationType;
  city: string;
  country: string;
  address?: string;
}

export interface CompanyLocation extends CompanyLocationData {
  address: string;
  coordinates: [number, number];
  isApproximate?: true;
}

export interface CompanyFunding {
  stage: string;
  amount?: number;
  currency?: string;
}

export interface CompanyData {
  id: string;
  name: string;
  description: string;
  categories: string[];
  links: {
    website: string;
    careers?: string;
    logo?: string;
  };
  options?: {
    founded?: number;
    employees?: string;
    funding?: CompanyFunding;
    remoteHiring?: boolean;
  };
  locations: CompanyLocationData[];
}

export interface Company extends Omit<CompanyData, 'locations'> {
  locations: CompanyLocation[];
}
