'use client';

import type { SelfHelpContent } from '@/lib/types';
import { selfHelpContent } from '@/lib/self-help-data';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { PlayCircle, Mic, FileText, Camera, BookHeart, Compass } from 'lucide-react';
import Link from 'next/link';

const getTypeIcon = (type: SelfHelpContent['type']) => {
  switch (type) {
    case 'Video':
      return <PlayCircle className="h-10 w-10 text-white/80" />;
    case 'Audio':
      return <Mic className="h-10 w-10 text-white/80" />;
    case 'Article':
      return <FileText className="h-10 w-10 text-white/80" />;
    case 'Image':
      return <Camera className="h-10 w-10 text-white/80" />;
    case 'Interactive Guide':
      return <Compass className="h-10 w-10 text-white/80" />;
    default:
      return null;
  }
};

const ContentCard = ({ content }: { content: SelfHelpContent }) => {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="p-0 relative">
        <Image
          src={content.imageUrl}
          alt={content.title}
          width={600}
          height={400}
          className="aspect-video object-cover"
          data-ai-hint="wellness resource"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {getTypeIcon(content.type)}
        </div>
        {content.duration && (
          <Badge variant="secondary" className="absolute bottom-2 right-2">
            {content.duration}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Badge variant="outline" className="mb-2">
          {content.category}
        </Badge>
        <CardTitle className="text-lg font-semibold mb-1 line-clamp-2">{content.title}</CardTitle>
        <CardDescription className="text-sm line-clamp-3">{content.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <p className="text-sm text-primary font-medium">View Resource &rarr;</p>
      </CardFooter>
    </Card>
  );
};

export default function SelfHelpPage() {
  const categories: SelfHelpContent['category'][] = [
    'Mindfulness',
    'Stress Management',
    'Academic Success',
    'Healthy Habits',
    'Personal Safety & Awareness',
  ];
  // Simulate a "For You" feed by mixing some content
  const forYouContent = [
    selfHelpContent[0],
    selfHelpContent[2],
    selfHelpContent[8],
    selfHelpContent[9],
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20">
        <CardHeader className="text-center p-8">
          <BookHeart className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold tracking-tight text-primary mt-2">
            Self-Help & Wellness Resources
          </CardTitle>
          <CardDescription className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore a curated collection of tools and resources to support your mental well-being
            and academic journey.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="foryou" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="foryou">For You</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category.replace(/ & /g, ' & ')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="foryou" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forYouContent.map((content) => (
              <Link
                key={content.id}
                href={`/self-help/${content.id}`}
                className="block h-full group"
              >
                <ContentCard content={content} />
              </Link>
            ))}
          </div>
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {selfHelpContent
                .filter((c) => c.category === category)
                .map((content) => (
                  <Link
                    key={content.id}
                    href={`/self-help/${content.id}`}
                    className="block h-full group"
                  >
                    <ContentCard content={content} />
                  </Link>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
