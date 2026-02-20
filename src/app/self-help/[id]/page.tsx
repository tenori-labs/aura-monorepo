'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { selfHelpContent } from '@/lib/self-help-data';
import type { SelfHelpContent } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Video, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function SelfHelpDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [content, setContent] = useState<SelfHelpContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const contentId = params.id as string;
    if (contentId) {
      const foundContent = selfHelpContent.find((item) => item.id === contentId);
      setContent(foundContent || null);
    }
    setIsLoading(false);
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground mb-4">Resource not found.</p>
        <Button variant="outline" onClick={() => router.push('/self-help')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
      </Button>

      <Card className="shadow-xl overflow-hidden">
        <div className="relative w-full h-48 sm:h-64 md:h-80 bg-muted">
          <Image
            src={content.imageUrl}
            alt={content.title}
            fill
            className="object-cover"
            data-ai-hint="wellness resource header"
            priority
          />
        </div>
        <CardHeader className="p-6 border-b">
          <CardTitle className="text-3xl font-bold text-primary">{content.title}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-1">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-12">
          {content.videoUrl && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground flex items-center">
                <Video className="mr-3 h-7 w-7 text-primary" /> Video Guide
              </h2>
              <div className="aspect-video w-full">
                <iframe
                  className="w-full h-full rounded-lg shadow-md border"
                  src={content.videoUrl}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground flex items-center">
              <BookOpen className="mr-3 h-7 w-7 text-primary" /> Detailed Guide
            </h2>
            <div className="prose prose-stone dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground">
              {content.detailedText}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
