
import { ClusterType, ImageType } from '@/types';

const allImages: ImageType[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Laptop on desk' },
  { id: '2', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Circuit board' },
  { id: '3', url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Code on monitor' },
  { id: '4', url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Person using MacBook' },
  { id: '5', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Woman with laptop' },
  { id: '6', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Matrix code' },
  { id: '7', url: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Colorful code on monitor' },
  { id: '8', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'MacBook with code lines' },
  { id: '9', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Green mountains aerial view' },
  { id: '10', url: 'https://images.unsplash.com/photo-1493397212122-2b85dda8106b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Wavy building architecture' },
  { id: '11', url: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'Tabby cat on floral textile' },
  { id: '12', url: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', alt: 'People around video screens' },
];

export const mockClusters: ClusterType[] = [
  {
    id: 'cluster1',
    title: 'Tech & Code',
    images: [allImages[0], allImages[1], allImages[2], allImages[3], allImages[7]],
    palette: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    description: 'Images related to technology, coding, and digital interfaces.',
  },
  {
    id: 'cluster2',
    title: 'Abstract & Geometric',
    images: [allImages[5], allImages[6], allImages[9]],
    palette: ['#4F46E5', '#D946EF', '#0EA5E9', '#F97316'],
    description: 'Visually striking abstract patterns and geometric designs.',
  },
  {
    id: 'cluster3',
    title: 'Nature & Animals',
    images: [allImages[8], allImages[10]],
    palette: ['#22C55E', '#EAB308', '#6366F1', '#F43F5E'],
    description: 'Scenes from nature and images featuring animals.',
  },
  {
    id: 'cluster4',
    title: 'Modern Workspaces',
    images: [allImages[0], allImages[3], allImages[4], allImages[11]],
    palette: ['#6B7280', '#1F2937', '#374151', '#9CA3AF'],
    description: 'Inspirational images of modern work environments and setups.',
  }
];
