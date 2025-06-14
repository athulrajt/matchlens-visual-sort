
export interface ImageType {
  id: string;
  url: string;
  alt: string;
}

export interface ClusterType {
  id: string;
  title: string;
  images: ImageType[];
  palette: string[]; // Array of hex color strings
  description?: string; // Optional description for the cluster
}
