
export interface ImageType {
  id: string;
  url: string;
  alt: string;
  image_path?: string; // For Supabase Storage path
}

export interface ClusterType {
  id: string;
  title: string;
  images: ImageType[];
  palette: string[]; // Array of hex color strings
  description?: string; // Optional description for the cluster
  tags?: string[]; // Optional: Tags that define the cluster
}
