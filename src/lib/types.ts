export type LocationType = 'headquarters' | 'office' | 'factory';

export interface CompanyLocation {
  id: string;
  type: LocationType;
  city: string;
  country: string;
  address: string;
  coordinates: [number, number];
  isApproximate?: true;
}

export interface CompanyFunding {
  stage: string;
  amount?: number;
  currency?: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  categories: string[];
  addedAt: string;
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
  locations: CompanyLocation[];
}
